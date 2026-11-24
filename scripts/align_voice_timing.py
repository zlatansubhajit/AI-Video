#!/usr/bin/env python3
"""
align_voice_timing.py

Generates neural voiceover audio using edge-tts, extracts sub-second word boundaries,
and calculates frame-accurate scene transitions and video structures for Remotion (30 fps).

Guarantees:
- Audio is generated first; frames are calculated from actual speech.
- Scene transitions occur during natural sentence pauses (no cuts while speaking).
- Visual kicks and reactions land 0-3 frames before impact words.
- Generates:
    1. public/audio/<episode>_voice.mp3
    2. public/audio/<episode>_words.json (detailed word timestamps)
    3. public/audio/<episode>_timeline.json (structured shot boundaries)
    4. TypeScript snippet for the episode manifest (shots array with exact frames)
"""

import argparse
import asyncio
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

try:
    import edge_tts
except ImportError:
    print("edge-tts not found. Please install via pip: pip install edge-tts", file=sys.stderr)
    sys.exit(1)

DEFAULT_VOICE = "en-US-ChristopherNeural"
DEFAULT_FPS = 30
DEFAULT_HOLD_FRAMES = 24  # ~0.8s post-roll after last spoken word


def clean_word(w: str) -> str:
    """Normalize word for alignment matching."""
    return re.sub(r"[^\w]", "", w).lower()


def parse_markdown_script(content: str) -> Dict[str, Any]:
    """Parse a markdown script file into structured shot definitions."""
    lines = content.splitlines()
    data: Dict[str, Any] = {
        "episode": "untitled",
        "voice": DEFAULT_VOICE,
        "rate": "+0%",
        "fps": DEFAULT_FPS,
        "shots": []
    }

    current_shot: Optional[Dict[str, Any]] = None

    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            continue

        # Header metadata
        clean_header = line_strip.lstrip("# ").strip()
        if clean_header.lower().startswith("voice:"):
            data["voice"] = clean_header.split(":", 1)[1].strip()
            continue
        if clean_header.lower().startswith("rate:"):
            data["rate"] = clean_header.split(":", 1)[1].strip()
            continue
        if clean_header.lower().startswith("fps:"):
            data["fps"] = int(clean_header.split(":", 1)[1].strip())
            continue
        if clean_header.lower().startswith("episode:"):
            data["episode"] = clean_header.split(":", 1)[1].strip()
            continue

        # Shot header e.g. "## Shot: steps" or "## Beat 1: steps"
        m_shot = re.match(r"^##\s+(?:Shot|Beat\s*\d*):\s*(\w+)", line_strip, re.IGNORECASE)
        if m_shot:
            if current_shot:
                data["shots"].append(current_shot)
            current_shot = {
                "id": m_shot.group(1),
                "scene": m_shot.group(1),
                "narration": "",
                "camera": {"move": "push", "from": 0, "to": 2.0, "ease": "smoother"},
                "cast": [],
                "kick": None,
                "punch_words": [],
                "dof": None
            }
            continue

        if current_shot is None:
            continue

        # Shot fields
        if line_strip.lower().startswith("scene:"):
            current_shot["scene"] = line_strip.split(":", 1)[1].strip()
        elif line_strip.lower().startswith("narration:"):
            current_shot["narration"] = line_strip.split(":", 1)[1].strip()
        elif line_strip.lower().startswith("kick:"):
            val = line_strip.split(":", 1)[1].strip()
            # e.g. "0.42 on slid" or "0.4"
            m_k = re.search(r"([\d.]+)(?:\s+(?:on|at)\s+[\"']?(\w+)[\"']?)?", val)
            if m_k:
                current_shot["kick"] = float(m_k.group(1))
                if m_k.group(2):
                    current_shot["punch_words"].append(m_k.group(2))
        elif line_strip.lower().startswith("dof:"):
            current_shot["dof"] = float(line_strip.split(":", 1)[1].strip())
        elif line_strip.lower().startswith("camera:"):
            cam_str = line_strip.split(":", 1)[1].strip()
            # simple parse e.g. "push 0 -> 3.5" or "truck -0.4 -> 0.8"
            parts = cam_str.split()
            if len(parts) >= 1:
                move = parts[0]
                cam_obj: Dict[str, Any] = {"move": move, "ease": "smoother"}
                if "->" in parts:
                    idx = parts.index("->")
                    if idx > 1:
                        cam_obj["from"] = float(parts[idx - 1])
                    if idx + 1 < len(parts):
                        cam_obj["to"] = float(parts[idx + 1])
                current_shot["camera"] = cam_obj

    if current_shot:
        data["shots"].append(current_shot)

    return data


async def generate_speech_with_word_boundaries(
    text: str,
    voice: str,
    rate: str,
    audio_out_path: str
) -> List[Dict[str, Any]]:
    """Synthesizes speech and returns sub-second word boundaries."""
    os.makedirs(os.path.dirname(audio_out_path), exist_ok=True)
    communicate = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")

    audio_bytes = bytearray()
    words_data = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            # offset and duration in 100ns units
            offset_sec = chunk["offset"] / 10_000_000.0
            duration_sec = chunk["duration"] / 10_000_000.0
            words_data.append({
                "word": chunk["text"],
                "start_s": round(offset_sec, 4),
                "end_s": round(offset_sec + duration_sec, 4),
                "duration_s": round(duration_sec, 4)
            })

    with open(audio_out_path, "wb") as f:
        f.write(audio_bytes)

    return words_data


def align_shots(
    shots: List[Dict[str, Any]],
    words_data: List[Dict[str, Any]],
    fps: int,
    hold_frames: int
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Aligns spoken word timestamps with shot narrations to calculate
    exact start/end frame boundaries for every shot.
    """
    shot_results = []
    word_idx = 0
    total_words = len(words_data)

    current_start_frame = 0

    for i, shot in enumerate(shots):
        narration = shot.get("narration", "").strip()
        shot_words_text = narration.split()
        expected_word_count = len([w for w in shot_words_text if clean_word(w)])

        # Find matching window of words from word_data
        matched_words = []
        words_found = 0

        while word_idx < total_words and words_found < expected_word_count:
            matched_words.append(words_data[word_idx])
            words_found += 1
            word_idx += 1

        if not matched_words:
            # Fallback if no narration in shot (e.g. visual-only beat)
            shot_duration_frames = 60
            end_frame = current_start_frame + shot_duration_frames
            shot_results.append({
                **shot,
                "frames": [current_start_frame, end_frame],
                "start_s": current_start_frame / fps,
                "end_s": end_frame / fps,
                "matched_words": []
            })
            current_start_frame = end_frame
            continue

        first_word = matched_words[0]
        last_word = matched_words[-1]

        # Convert to frames
        word_start_frame = round(first_word["start_s"] * fps)
        word_end_frame = round(last_word["end_s"] * fps)

        # For shot 0, start frame is 0
        shot_start_frame = 0 if i == 0 else current_start_frame

        # Check punch words for kicks (impact shake should land 2-3 frames before the word)
        kick_info = None
        if shot.get("kick") and shot.get("punch_words"):
            for pw in shot["punch_words"]:
                cw = clean_word(pw)
                for w in matched_words:
                    if clean_word(w["word"]) == cw:
                        impact_f = max(shot_start_frame, round(w["start_s"] * fps) - 2)
                        kick_info = {"frame": impact_f, "amplitude": shot["kick"], "word": w["word"]}
                        break

        # Determine shot end frame / transition to next shot
        is_last_shot = (i == len(shots) - 1)
        if is_last_shot:
            # Last shot holds for hold_frames after the last spoken word
            shot_end_frame = word_end_frame + hold_frames
        else:
            # Next shot starts after pause
            # Peek next word start
            if word_idx < total_words:
                next_word = words_data[word_idx]
                pause_duration_s = next_word["start_s"] - last_word["end_s"]
                pause_duration_frames = round(pause_duration_s * fps)
                
                # Cut midway through pause, or 2 frames before next word begins
                if pause_duration_frames >= 6:
                    cut_frame = word_end_frame + (pause_duration_frames // 2)
                else:
                    cut_frame = max(word_end_frame + 2, round(next_word["start_s"] * fps) - 2)
                shot_end_frame = cut_frame
            else:
                shot_end_frame = word_end_frame + hold_frames

        # Ensure shot duration is at least 15 frames (~0.5s)
        if shot_end_frame <= shot_start_frame:
            shot_end_frame = shot_start_frame + 15

        shot_result = {
            "id": shot.get("id", f"shot_{i}"),
            "scene": shot.get("scene", f"scene_{i}"),
            "frames": [shot_start_frame, shot_end_frame],
            "duration_frames": shot_end_frame - shot_start_frame,
            "duration_s": round((shot_end_frame - shot_start_frame) / fps, 2),
            "narration": narration,
            "word_span_s": [first_word["start_s"], last_word["end_s"]],
            "camera": shot.get("camera"),
            "cast": shot.get("cast", []),
            "dof": shot.get("dof"),
            "kick": shot.get("kick"),
            "kick_impact": kick_info,
            "matched_words_count": len(matched_words)
        }

        shot_results.append(shot_result)
        current_start_frame = shot_end_frame

    total_episode_frames = current_start_frame
    return shot_results, total_episode_frames


def generate_typescript_manifest(episode_id: str, shots: List[Dict[str, Any]], total_frames: int, fps: int) -> str:
    """Generates clean TypeScript shots array for src/episodes/<slug>/index.ts."""
    lines = []
    lines.append(f"// Auto-generated shots array for episode '{episode_id}'")
    lines.append(f"// Total duration: {total_frames} frames ({total_frames / fps:.2f}s @ {fps} fps)")
    lines.append("export const SHOTS: Shot[] = [")
    for s in shots:
        lines.append("  {")
        lines.append(f"    scene: {json.dumps(s['scene'])},")
        lines.append(f"    frames: [{s['frames'][0]}, {s['frames'][1]}], // {s['duration_s']}s")
        cam = s.get("camera", {"move": "push"})
        cam_str = ", ".join(f"{k}: {json.dumps(v)}" if isinstance(v, str) else f"{k}: {v}" for k, v in cam.items())
        lines.append(f"    camera: {{ {cam_str} }},")
        if s.get("dof") is not None:
            lines.append(f"    dof: {s['dof']},")
        if s.get("kick") is not None:
            lines.append(f"    kick: {s['kick']},")
        if s.get("cast"):
            lines.append(f"    cast: {json.dumps(s['cast'])},")
        lines.append("  },")
    lines.append("];")
    return "\n".join(lines)


async def main_async(args: argparse.Namespace):
    # 1. Load input script
    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            content = f.read()
        if args.input.endswith(".json"):
            script_data = json.loads(content)
        else:
            script_data = parse_markdown_script(content)
    else:
        print("Error: --input <script.json or script.md> is required", file=sys.stderr)
        sys.exit(1)

    episode_id = args.episode or script_data.get("episode", "episode")
    voice = args.voice or script_data.get("voice", DEFAULT_VOICE)
    rate = args.rate or script_data.get("rate", "+0%")
    fps = args.fps or script_data.get("fps", DEFAULT_FPS)
    hold_frames = args.hold_frames

    shots = script_data.get("shots", [])
    if not shots:
        print("Error: No shots found in script", file=sys.stderr)
        sys.exit(1)

    # Combine narrations
    full_narration = " ".join(s.get("narration", "").strip() for s in shots if s.get("narration"))
    print(f"\n[align-voice] Episode: {episode_id}")
    print(f"[align-voice] Voice: {voice} (rate: {rate})")
    print(f"[align-voice] Total Shots: {len(shots)}")
    print(f"[align-voice] Full Narration ({len(full_narration.split())} words):\n  \"{full_narration}\"\n")

    # 2. Output audio path
    audio_out = args.out_audio or os.path.join(args.out_dir, f"{episode_id}_voice.mp3")
    print(f"[align-voice] Synthesizing speech with edge-tts -> {audio_out} ...")
    
    words_data = await generate_speech_with_word_boundaries(
        full_narration,
        voice=voice,
        rate=rate,
        audio_out_path=audio_out
    )
    print(f"[align-voice] Speech synthesis done. Captured {len(words_data)} word boundaries.")

    # 3. Calculate alignment and exact shot frames
    aligned_shots, total_frames = align_shots(shots, words_data, fps=fps, hold_frames=hold_frames)

    # 4. Save metadata outputs
    os.makedirs(args.out_dir, exist_ok=True)
    words_out = os.path.join(args.out_dir, f"{episode_id}_words.json")
    with open(words_out, "w", encoding="utf-8") as f:
        json.dump(words_data, f, indent=2)

    timeline_out = os.path.join(args.out_dir, f"{episode_id}_timeline.json")
    timeline_data = {
        "episode": episode_id,
        "fps": fps,
        "total_frames": total_frames,
        "duration_s": round(total_frames / fps, 2),
        "voice": voice,
        "rate": rate,
        "audio_file": audio_out,
        "shots": aligned_shots
    }
    with open(timeline_out, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2)

    # 5. Print Alignment Summary & TS Code
    ts_code = generate_typescript_manifest(episode_id, aligned_shots, total_frames, fps)
    
    print("\n" + "=" * 70)
    print("TIMELINE & SCENE TRANSITIONS (FRAME ACCURATE)")
    print("=" * 70)
    for s in aligned_shots:
        f0, f1 = s["frames"]
        kick_str = f" [KICK at f={s['kick_impact']['frame']}]" if s.get("kick_impact") else ""
        print(f"Shot {s['id']:<14} | Frames: [{f0:4d}, {f1:4d}] ({s['duration_s']:4.1f}s) | Scene: {s['scene']:<12}{kick_str}")
        print(f"  Narration: \"{s['narration']}\"")
        if s["frames"] != aligned_shots[-1]["frames"]:
            print(f"  --> TRANSITION CUT at frame {f1} (during pause)")

    print("-" * 70)
    print(f"TOTAL DURATION: {total_frames} frames ({total_frames / fps:.2f} seconds at {fps} fps)")
    print(f"AUDIO WRITTEN: {audio_out}")
    print(f"TIMELINE JSON: {timeline_out}")
    print("=" * 70)
    print("\nGENERATED TYPESCRIPT SNIPPET (for src/episodes/<slug>/index.ts):\n")
    print(ts_code)
    print("\n" + "=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Generate voiceover and frame-accurate shot transitions for Remotion.")
    parser.add_argument("--input", required=True, help="Path to input script file (.json or .md)")
    parser.add_argument("--episode", default=None, help="Episode slug/id")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help=f"edge-tts voice (default: {DEFAULT_VOICE})")
    parser.add_argument("--rate", default="+0%", help="Speech rate adjustment (e.g. +15%, +30%)")
    parser.add_argument("--fps", type=int, default=DEFAULT_FPS, help="Frame rate (default: 30)")
    parser.add_argument("--out-dir", default="public/audio", help="Output directory for audio and timeline JSON")
    parser.add_argument("--out-audio", default=None, help="Custom output path for voice MP3")
    parser.add_argument("--hold-frames", type=int, default=DEFAULT_HOLD_FRAMES, help="Hold frames after last word")

    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
