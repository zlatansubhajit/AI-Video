#!/usr/bin/env python3
"""
Generate AI Voiceovers for Dancing Bridge using edge-tts (free natural neural voices).
Outputs to public/audio/voice_fast.mp3 and public/audio/voice_full.mp3.
"""

import os
import sys
import subprocess
import asyncio

# Ensure edge-tts is available
try:
    import edge_tts
except ImportError:
    print("Installing edge-tts for high-quality neural voiceover...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--break-system-packages", "edge-tts"])
    import edge_tts

VOICE = "en-US-ChristopherNeural"  # Clear, steady documentary/storyteller tone

TEXT_FAST = (
    "Two guys were strolling across a suspension bridge on a quiet afternoon. "
    "Suddenly, one breaks into an impromptu dance, and the other joins right in! "
    "Their synchronized stomping hits the bridge's natural resonance—and the whole deck starts wobbling violently! "
    "Panicking, they ditch the choreography, scramble to safety, and swear to never dance on bridges again."
)

TEXT_FULL = (
    "Two guys accidentally shook an entire suspension bridge just by doing a dance. "
    "It's a quiet sunny afternoon, and the long wooden suspension bridge over the river is the pride of the valley. "
    "Two friends are strolling across, enjoying the view and having a casual chat. "
    "Halfway over, one of them gets a sudden burst of energy and starts dancing. "
    "The other guy laughs and joins right in. "
    "They start grooving, stomping their boots to an imaginary beat, hitting the wooden deck in perfect synchronization. "
    "Then, the bridge joins the dance. "
    "The whole deck starts wobbling under their feet, swaying side to side like a giant jump rope. "
    "The iron chains groan, the planks rattle, and what started as a goofy groove turns into a terrifying ride. "
    "Luckily, the bridge was built with high-strength iron chains. "
    "Unluckily, the bridge was built with high-strength iron chains—so instead of breaking, it just bounced like a massive trampoline. "
    "You see, every bridge has a natural frequency it likes to sway at. "
    "Ever pushed a kid on a swing? Each push is tiny, but if they all land at just the right moment, the swing flies higher and higher. "
    "By dancing in rhythm, the two men were pushing the bridge like a swing. "
    "Panicking, they ditched the choreography, grabbed the ropes, and hurried across as fast as they could. "
    "They finally stepped onto solid ground, their legs shaking like jelly. "
    "The bridge stopped wobbling. And from that day on, whenever they feel like dancing, they stick strictly to dry land."
)

async def generate(text: str, out_path: str, rate: str = "+0%"):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    print(f"Generating voiceover: {out_path} ...")
    communicate = edge_tts.Communicate(text, VOICE, rate=rate)
    await communicate.save(out_path)
    print(f"Done: {out_path}")

async def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "public", "audio")
    
    # 15s fast version: slightly brisk pace (+8%) to comfortably fit 14s
    await generate(TEXT_FAST, os.path.join(out_dir, "voice_fast.mp3"), rate="+8%")
    # Full version: standard steady pace
    await generate(TEXT_FULL, os.path.join(out_dir, "voice_full.mp3"), rate="+0%")

if __name__ == "__main__":
    asyncio.run(main())

