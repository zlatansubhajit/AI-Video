---
name: cartoon-3d-short
description: Make vertical cartoon 3D story shorts (~15s quick, ~30s short, ~48-55s compact drama, or ~55-70s full) in the "2D characters in a colourful 3D world" style (flat bean-head cartoon cards with ink outlines, painted 3D world with black ink lines, saturated sky, depth-of-field backgrounds, gliding cameras, neural voiceover, and synchronized SFX/music), rendered with three.js inside Remotion. Covers the complete end-to-end pipeline: scriptwriting, speech alignment, consistent background asset production (3D kit sets, code stages, or 3D-baked 2.5D plates), cast staging, and multi-tier rendering.
---

# Cartoon 3D Story Short Pipeline (three.js + Remotion)

## 1. Overview & Core Philosophy

This video pipeline produces vertical animated shorts where **flat 2D cartoon characters live, move, and react inside a vibrant painted 3D world**.

### The Two Foundational Rules:
1. **Audio Dictates Visual Cuts (Never the reverse):** Speech cadence and natural pauses determine exact shot boundaries. Cuts must never slice through spoken sentences, and visual impact kicks must land 0 to 3 frames before punch words.
2. **Strict Art Style Consistency:** The background world must share the project's established visual grammar: painted textures, two-tone shading, cel outlines, and curated color palettes. **Never use generic external AI image generators** that inject realistic textures, photographic noise, or clashing artistic styles. Environments are built from procedural 3D kit sets, custom three.js code stages, or plates baked directly from 3D sets.

---

## 2. Complete End-to-End Pipeline

```
[1. Story & Topic] ──> [2. SCRIPT.md] ──> [3. align_voice_timing.py] ──> public/audio/<slug>_voice.mp3
                                                                            public/audio/<slug>_timeline.json
                                                                                         │
  ┌──────────────────────────────────────────────────────────────────────────────────────┘
  ▼
[4. Consistent World & Backgrounds]
  ├── Mode A: Procedural 3D Kit Presets (park-lawn, city-square, riverside)
  ├── Mode B: Custom Procedural Code Stages (three.js geometry + painted textures)
  └── Mode C: 3D-Baked 2.5D Plates (scripts/plates.mjs -> 4K base + depth from 3D scene)
  ▼
[5. Episode Manifest (src/episodes/<slug>/index.ts)]
  ├── Locked Cast Staging (andy, red, guard, plus reusable archetypes with actions & props)
  ├── Camera Grammar (push, truck, crane, creep, orbit + kicks)
  └── Exact Frame Timings from Audio Timeline
  ▼
[6. Render & Verification]
  ├── Draft Stills Check (remotion still <slug>Draft)
  └── Multi-Tier Video Render (540p draft / 1080p final)
```

---

## 3. Step 1: Beat Script & Story Timing

### Comedic & Documentary Beat Formula
1. **Hook:** The absurd or surprising true fact in one punchy line.
2. **Setting:** Year, location, historical pride, or context.
3. **Action Escalation:** 2 to 4 escalating beats where tension builds.
4. **Snap / Accident:** The exact moment the plan fails or physical event happens.
5. **Deadpan Reaction:** A comedic contrast or double-take (e.g. "Just checking for leaks!").
6. **Explanation / Truth:** The true historical fact or scientific principle.
7. **Callback Twist / Punchline:** Consequence ending on a punchline callback.

*Never describe on screen what the viewer already sees in the 3D world.*

### Dramatic Lesson Beat Formula (48–55 s compact)
For a sincere single-arc story rather than a joke:
1. **Hook / proposition:** a sympathetic "Imagine being trapped…" or a stark fact, one sentence.
2. **Wrong sentence / wall:** the injustice or limit that defines the character's life.
3. **False surrender:** everyone else accepts the wall; the protagonist quietly refuses.
4. **Invisible process:** a repetitive physical action over years, shown as a short montage.
5. **Break:** one storm/accident beat where the accumulated work becomes visible.
6. **Release:** a sensory payoff — rain, light, open sky — with almost no dialogue.
7. **Lesson:** one direct second-person takeaway, then end on the last word. No callback joke.

The shawshank_hope build used this shape: 7 shots, 143 words, 50.77 s, 2.88 words/s, `+30%` voice rate, no captions.

### Target Formats & Word Count Budget (30 fps)
| Format | Target Length | Frame Count | Word Count | Delivery Rate | Best For |
|---|---|---|---|---|---|
| **Quick Short** | ~14–15 s | 420–450 frames | 35–48 words | +20% to +35% | Viral gags, punchy trivia |
| **30-Second Short** | ~30 s | 880–920 frames | 75–85 words | +18% to +28% | Social shorts, full comedy sketches |
| **Compact Full Story** | ~48–55 s | 1440–1650 frames | 135–165 words | +25% to +35% | Single-arc drama, fables, motivational lessons |
| **Full Story Short** | ~55–70 s | 1650–2100 frames | 180–230 words | +0% to +8% | Documentary history & science |

A +30% voice rate does **not** guarantee 3.7 words/s. Dramatic pauses, held reaction shots, and a slow final lesson can land at ~2.8–3.0 words/s. Budget from the measured timeline, not from word count alone.

### Script File Format (`src/episodes/<slug>/SCRIPT.md`)
This is the compact-drama example. The same file format works for the comedic formula; only the narration and beat shape change. The original 67 s bridge script is preserved in `templates/SCRIPT_example.md`; the compact version shown here is also saved as `templates/SCRIPT_example_compact.md`.
```markdown
# Episode: shawshank_hope
Voice: en-US-ChristopherNeural
Rate: +30%
FPS: 30

## Shot: hook_hammer
Scene: cell_hook
Camera: push 0 -> 1.2
Kick: 0.30 on patience
Dof: 3
Narration: Imagine being trapped in a hopeless situation for nineteen years, with nothing but a tool the size of your finger to get you out. This is the ultimate lesson in patience.

## Shot: yard_despair
Scene: prison_yard
Camera: truck -0.5 -> 0.5
Dof: 0
Narration: Wrongly sentenced to life, Andy Dufresne faced brutal walls and endless gray days. Even his closest friend warned him: hope is dangerous in here.

## Shot: quiet_plan
Scene: cell_poster
Camera: push 0 -> 1.0
Dof: 2
Narration: Everyone else surrendered to the walls. Andy did not. Hidden behind a poster, he began a quiet rebellion.

## Shot: chip_montage
Scene: cell_chipping
Camera: creep 0 -> 0.8
Kick: 0.25 on nineteen
Dof: 2
Narration: Night after night, one tiny strike against solid stone. Invisible progress. No shortcuts. Just unwavering patience for nineteen straight years.

## Shot: storm_breakthrough
Scene: cell_breach
Camera: push 0 -> 1.3
Kick: 0.45 on shattered
Dof: 0
Narration: Then one stormy night, the impossible finally shattered. Years of quiet discipline broke straight through.

## Shot: rain_freedom
Scene: freedom_storm
Camera: push 0 -> 1.4
Kick: 0.35 on free
Dof: 0
Narration: Crawling out of the darkness into pouring rain, Andy stood tall, completely free.

## Shot: lesson_sunrise
Scene: freedom_sunrise
Camera: push 0 -> 1.1
Dof: 0
Narration: You cannot always change your life overnight. But small, consistent actions fueled by hope can break the thickest walls. Keep chipping away.
```

---

## 4. Step 2: Voice Synthesis & Sub-Second Alignment

Run the timing alignment tool inside Docker:

```bash
docker compose run --rm remotion python3 scripts/align_voice_timing.py \
  --input src/episodes/<slug>/SCRIPT.md \
  --episode <slug> \
  --rate "+22%" \
  --hold-frames 24 \
  --out-dir public/audio
```

### What this tool does automatically:
1. Synthesizes high-fidelity neural audio using `edge-tts` (`en-US-ChristopherNeural`).
2. Streams and captures sub-second `WordBoundary` timestamps for every spoken word.
3. Maps words to their corresponding shots.
4. Identifies pauses between sentences and places cuts midway through pauses:
   $$F_{\text{cut}} = \text{round}\left( \frac{t_{\text{end}} + t_{\text{start}}}{2} \times \text{fps} \right)$$
5. Anticipates kick words by placing camera shakes **0 to 3 frames BEFORE** the impact word:
   $$F_{\text{kick}} = \max(F_{\text{start}}, \text{round}(t_{\text{word}} \times \text{fps}) - 2)$$
6. Writes:
   - `public/audio/<slug>_voice.mp3` (the audio track)
   - `public/audio/<slug>_words.json` (sub-second timestamp log)
   - `public/audio/<slug>_timeline.json` (structured shot frame boundaries)
7. Prints a frame-accurate TypeScript `shots` array ready for `src/episodes/<slug>/index.ts`.

---

## 5. Step 3: Backgrounds & Assets (Preserving Art Style Consistency)

To ensure the world matches the established 3D cartoon aesthetic (seen in *The Bridge That Fell for a Song*), environments must be built or baked using the engine's native three.js systems. Do not start from a previous episode's story or copy its sets; reuse the engine grammar (painted textures, ink, two-tone shading) and build the new world from those pieces.

### Background Production Modes (In Order of Preference)

#### Mode 1: Procedural 3D Kit Sets (`kind: "kit"`)
Best for streets, parks, promenades, plazas, wilderness, and weather scenes.
- Assembled from reusable geometric prefabs in `src/engine/kit/`:
  - `woods-camp`: conifer forest, dirt trail, open A-frame tent, campfires (active fire or cold charcoal), rocks and boulders.
  - `park-lawn`: lush manicured lawns, trees, bandstand, flower beds, park lamps.
  - `city-square`: stone slab paving slabs, market stalls, crates, barrels, two-tier fountain, bollards.
  - `riverside`: river promenade, water surface with reflection waves, lanterns.
- Supports weather presets (`weather: "rain"` or `"snow"`, `wind: 0..1`) and lighting (`day`, `golden`, `overcast`, `night`).

#### Mode 2: Procedural 3D Code Stages (`kind: "code"`)
Best for unique historical landmarks, hero mechanisms, or specialized comedy sets.
- Built as Three.js React components registered in `src/engine/composition/registry.tsx`.
- Uses painted HD canvas textures from `textures.ts` (e.g. `getSteelTexture`, `getDeckTexture`).
- Uses procedural props from `props.ts` (e.g. `createTrussBar`, `createSearchlightBeam`).

#### Mode 3: Baking 2.5D Static Plates from 3D Sets (`kind: "plate"`)
When rendering speed needs optimization (rendering drops from ~3.6 ms/frame to **0.36 ms/frame**):
- **Never use generic external AI image generators** that inject photorealistic noise or clashing styles.
- **Bake the plate directly from the 3D scene:**
  1. Define a `PlateDef` in `src/episodes/<slug>/plates.ts` naming the 3D scene preset and camera pose.
  2. Export in `src/episodes/index.ts`.
  3. Run the baker:
     ```bash
     docker compose run --rm remotion node scripts/plates.mjs
     ```
  4. Output: `public/plates/<id>.base.png` (2160x3840 color) and `<id>.depth.png` (log-depth map).
  5. The plate retains 100% style, palette, and ink consistency with the 3D world, while `PlateStage` provides runtime depth parallax displacement under live 3D cartoon characters!

---

## 6. Step 4: Cast Library & Character Staging

### Characters (`src/engine/cast/library.ts` & `toon.ts`)
- Flat bean-head cartoon characters drawn using the `Pen` Canvas2D API:
  - Superellipse bean heads (`headBlob`), lidded eyes, no blush, no catchlights.
  - Variable-width plum ink outline (`#241726`) weighted away from the light.
  - Single-stroke limbs with ink-dot hands.
  - Live billboards placed on layer `NOINK` with dynamic ground contact shadows.

### Cast Members:
The library is **additive**. Add a named outfit plus a fixed seed; never redraw an existing character. The compact-drama build added:
- `andy`: faded blue prison chambray (`#6b86a8`), dark navy trousers, brown boots, dark hair, warm skin; height `1.0`.
- `andy_wet`: darker soaked variant of the same face and outfit (`#4f6886` jacket), used only after the escape.
- `red`: grey-blue prison jacket (`#7f8e9c`), slate trousers, grey hair and moustache, deeper skin; height `0.98`.
- `guard`: dark navy uniform, peaked cap, brass buttons, boots.

Other reusable archetypes remain available: `worker`, `officer`, `soldier`, `kid`, `woman`, `man`. The original bridge build used `officer`, `soldier`, `kid`, `woman`, `man`, and `worker`.

### Action Vocabulary:
Actions are small pose functions on the episode clock. Add a new action when a beat needs a silhouette the generic walk/stand cannot give:
- `study_hammer`: holds the hammer up at chest height, head tilted down, still and patient.
- `warn`: one hand raised, torso turned toward the other actor, stern.
- `listen_grave`: head lowered, shoulders heavy, attention on the speaker.
- `poster_glance`: still body, eyes/head turned toward the poster.
- `chip_wall`: repeated hammer swing at `0.12 + 0.82 * max(0, sin(t * 6.2))`.
- `triumph`: both arms overhead (`armsUp: 0.92`) in the rain.
- `free_stand`: both arms opened wide (`armsOut: 0.72`), chin up, at sunrise.
- Generic: `walk`, `work`, `wave`, `cheer`.

Pose extensions live in `FrontOpts`: `armsUp` (overhead), `armsOut` (wide at shoulder height), and `headTilt` (independent head angle). `Shot` also supports `kickAt` for an absolute episode frame; use it instead of relying on the shot start when the impact word sits mid-shot.

---

## 7. Step 5: Episode Manifest Assembly

In `src/episodes/<slug>/index.ts`, assemble the data-driven manifest. This is the 7-shot `shawshank_hope` manifest; note the absolute `kickAt` frames, the expression timelines on grim words, and `audio.voice` pointing at the muxed mix rather than the raw voice:

```ts
import type { Episode } from "../../engine/shot/types";

export const shawshankHope: Episode = {
  id: "shawshank-hope",
  title: "Hope Chips Through",
  fps: 30,
  frames: 1523,
  width: 1080,
  height: 1920,
  scenes: {
    cell_hook: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "hook" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0.18, 1.5, 4.2], target: [0.08, 1.12, -1.2], fov: 40 },
    },
    prison_yard: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "yard" },
      light: "overcast",
      sun: { az: 165, el: 50 },
      camera: { position: [0, 1.55, 9.2], target: [0, 1.38, 4.2], fov: 44 },
    },
    cell_poster: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "poster" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0.1, 1.45, 3.25], target: [0.1, 1.33, -1.2], fov: 38 },
    },
    cell_chipping: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "chip" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0.85, 1.3, 3.35], target: [-0.05, 1.12, -1.5], fov: 38 },
    },
    cell_breach: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "breach" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0, 1.35, 3.7], target: [0.13, 1.22, -1.4], fov: 40 },
    },
    freedom_storm: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "storm" },
      light: "night",
      sun: { az: 152, el: 34 },
      camera: { position: [0.3, 0.56, 5.1], target: [0.02, 1.5, -0.3], fov: 42 },
    },
    freedom_sunrise: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "sunrise" },
      light: "golden",
      camera: { position: [0.15, 0.9, 5.0], target: [0.1, 1.15, 0], fov: 40 },
    },
  },
  shots: [
    {
      scene: "cell_hook",
      frames: [0, 238],
      camera: { move: "push", from: 0, to: 1.2, ease: "smoother" },
      kick: 0.3,
      kickAt: 210, // "patience"
      dof: 3,
      cast: [
        {
          actor: "andy",
          at: [0.02, 0, -0.35],
          facing: 4,
          action: "study_hammer",
          look: 0.5,
          exprTimeline: [
            { frame: 0, expr: "stern" },
            { frame: 150, expr: "pained" },
            { frame: 205, expr: "stern" },
          ],
        },
      ],
    },
    {
      scene: "prison_yard",
      frames: [238, 473],
      camera: { move: "truck", from: -0.5, to: 0.5, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "andy",
          at: [-0.55, 0, 4.42],
          facing: 34,
          action: "listen_grave",
          look: -0.3,
          exprTimeline: [
            { frame: 238, expr: "neutral" },
            { frame: 330, expr: "pained" },
            { frame: 408, expr: "stern" },
          ],
        },
        {
          actor: "red",
          at: [0.52, 0, 4.58],
          facing: -32,
          action: "warn",
          look: -0.8,
          exprTimeline: [{ frame: 238, expr: "stern" }],
        },
      ],
    },
    {
      scene: "cell_poster",
      frames: [473, 673],
      camera: { move: "push", from: 0, to: 1.0, ease: "smoother" },
      dof: 2,
      cast: [
        {
          actor: "andy",
          at: [-0.24, 0, -0.32],
          facing: 0,
          action: "poster_glance",
          look: 0.85,
          exprTimeline: [
            { frame: 473, expr: "neutral" },
            { frame: 560, expr: "stern" },
            { frame: 615, expr: "relief" },
          ],
        },
      ],
    },
    {
      scene: "cell_chipping",
      frames: [673, 958],
      camera: { move: "creep", speed: 0.08, ease: "linear" },
      kick: 0.25,
      kickAt: 915, // "nineteen"
      dof: 2,
      cast: [
        {
          actor: "andy",
          at: [-0.18, 0, -0.34],
          facing: 18,
          action: "chip_wall",
          look: 0.55,
          exprTimeline: [
            { frame: 673, expr: "stern" },
            { frame: 800, expr: "pained" },
            { frame: 870, expr: "stern" },
            { frame: 912, expr: "pained" },
            { frame: 926, expr: "stern" },
          ],
        },
      ],
    },
    {
      scene: "cell_breach",
      frames: [958, 1134],
      camera: { move: "push", from: 0, to: 1.3, ease: "smoother" },
      kick: 0.45,
      kickAt: 1030, // "shattered"
      dof: 0,
      cast: [],
    },
    {
      scene: "freedom_storm",
      frames: [1134, 1263],
      camera: { move: "push", from: 0, to: 1.4, ease: "smoother" },
      kick: 0.35,
      kickAt: 1241, // "free"
      dof: 0,
      cast: [
        {
          actor: "andy_wet",
          at: [0.05, -0.12, 0.25],
          facing: 0,
          action: "triumph",
          exprTimeline: [
            { frame: 1134, expr: "relief" },
            { frame: 1200, expr: "relief_open" },
            { frame: 1238, expr: "relief" },
          ],
        },
      ],
    },
    {
      scene: "freedom_sunrise",
      frames: [1263, 1523],
      camera: { move: "push", from: 0, to: 1.1, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "andy",
          at: [0.1, 0, -0.3],
          facing: 0,
          action: "free_stand",
          exprTimeline: [
            { frame: 1263, expr: "relief" },
            { frame: 1400, expr: "smile_closed" },
            { frame: 1470, expr: "smile" },
          ],
        },
      ],
    },
  ],
  audio: {
    voice: "audio/shawshank_hope_mix.mp3",
  },
};
```

---

## 8. Step 6: Multi-Tier Verification & Rendering

### Composition Tiers in `Root.tsx`:
- `<slug>Draft`: 540 × 960 (WebGL buffer reduced 4x; super-fast preview rendering).
- `<slug>`: 1080 × 1920 (Full-res final render with post chain: ink, lens blur, bloom, tone mapping, color grade).

### 1. Verify Draft Stills
Render sample frames from each shot **and the exact story beats**. Evenly spaced frames miss expression and prop errors:
```bash
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f50.png --frame=50
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f912.png --frame=912
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f958.png --frame=958
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f1050.png --frame=1050
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f1241.png --frame=1241
```
For `shawshank_hope`, those catch the pained face on "nineteen", the start of the breach, the flash/tunnel frame, and the "free" kick with arms up. Add the shot-boundary frame (e.g. 1263) when the set changes completely.

### 2. Render Fast 540p Video
```bash
docker compose run --rm remotion npx remotion render src/index.ts <slug>Draft out/<slug>_540p.mp4
```

### 3. Render Final 1080p Video
```bash
docker compose run --rm remotion npx remotion render src/index.ts <slug> out/<slug>_final.mp4 --codec h264 --crf 16
```

### 4. Audio-only revision (do not re-render the frames)
If the picture is already approved and only the mix changed, replace the audio stream with video copy. This preserves the exact reviewed frames and is orders of magnitude faster than a 1080p re-render:
```bash
docker compose run --rm remotion ffmpeg -y -i out/<slug>_final.mp4 \
  -i public/audio/<slug>_mix.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest \
  -movflags +faststart out/<slug>_final_remux.mp4
```
Verify the video stream MD5 is identical before replacing the deliverable, and check that decoded audio lag is 0 samples. Do not remux a file that already has the new mix; AAC is lossy and re-encoding it again only degrades it.

### 5. Verify the deliverable
```bash
docker compose run --rm remotion ffprobe -v error \
  -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate,channels \
  -show_entries format=duration,size -of default=noprint_wrappers=1 out/<slug>_final.mp4
docker compose run --rm remotion ffprobe -v error -count_frames -select_streams v:0 \
  -show_entries stream=nb_read_frames -of default=noprint_wrappers=1 out/<slug>_final.mp4
```
For a 50.77 s build expect `1080x1920`, `30/1`, ~`50.7667`, and `nb_read_frames=1523`. Check loudness with `ebur128=peak=true`; the mastered WAV should be ~`-15 LUFS / -1.2 dBTP`, while the AAC stream may read ~0.2 dB hotter on true peak.

---

## 9. Reference Look Targets (The Bridge Standard)

These are the measured look targets established by the original bridge build and the reference channel.

- **Ink:**
  - World lines: ~3 px at 1080 wide, near-black `#0b0a0c`, nearly constant with distance. Silhouettes, depth jumps, and normal creases only. Character cards are on layer `NOINK` (carrying their own plum ink).
  - Character ink: dark plum `#201628`–`#2f1d28`, weighted thicker on the bottom/shadow side.
- **Lighting:**
  - `day`: az 75 / el 48, cool shadow tint only in shade, sky `#3e7fd2` -> horizon `#b8d0ec`.
  - `golden`: az 25 / el 22, warm sunset key `#ffab5e`, balanced shadows with preserved terrain albedo, peach sky `#ffc47c` -> `#8a6f8a`. (Never drop elevation below 18° or shadow blankets will cover 100% of terrain).
  - `overcast`: az 40 / el 55, flat cool key, soft light for rain and snow.
  - `night`: az 35 / el 38, silvery moon key `#b5d0ff`, lunar disc + halo, deep indigo shadows `#10172a`, sky `#080d1a` -> `#16223d`.
- **Character Animation & Life (Crucial Quality Standard):**
  - Characters must NEVER be static cardboard cutouts. Standing actors have breathing bob (`idleBreathing`) and subtle sways.
  - Use `at` and `to` with `ease` for walking/travel movement across 3D space.
  - Dynamic facial expressions: use `exprTimeline` to transition expressions on story beats (e.g. from guarded to pained on a grim word, then stern again).
  - Fear & cold: use `shiver: 0..1` to trigger organic visceral trembling (45 Hz micro-jitter and tilt vibration).
  - Eye tracking: use `look: -1..1` to glance toward dialogue partners or sudden off-screen sounds.
  - Natural 4-frame blinks hide expression swaps seamlessly.
- **Environment Life:**
  - Every set must have living motion: drifting clouds (`cloudField`), moving water ripples, flickering practicals, or wind-blown weather (`WeatherLayer`).
- **Materials:**
  - ALWAYS use `twoTone` cel shading with `MeshLambertMaterial` and painted canvas textures. NEVER use raw `MeshStandardMaterial`.
- **Depth of Field (DOF Rules):**
  - **Wide & Walking Shots:** ALWAYS set `dof: 0`. Never apply DOF on wide shots, travel shots, or landscapes; it blurs characters and scenery together.
  - **Medium & Close Shots:** Use subtle `dof: 2–6` (never extreme 10–16). The engine automatically locks the focal plane to the primary actor's 3D position (`shot.cast[0]`) and tracks their movement.
- **Camera Movement:**
  - 18–40 frame smootherstep glides.
  - Every hold creeps (0.15–0.35 %/f); never freeze on a static hold.
  - Impact kicks flip sign every frame and decay over 7 frames.

---

## 10. Production Learnings & Staging Rules (Guaranteed Quality Replication)

When generating new episodes with `/cartoon-3d-short`, adhere strictly to these architectural rules:

### 1. Vertical 9:16 Frustum & Staging Geometry
- In vertical 9:16 portrait video, the horizontal field of view is approximately **half** the vertical FOV.
- Objects placed at $|X| > 1.2\text{m}$ at distances under 5m easily clip outside the screen.
- **Depth Stacking Pattern:** Align multi-object scenes along the camera's Z-axis:
  - Background anchor (e.g. colonnade, monument facade, landmark): placed directly in line of sight at $Z = -1.0\text{ to } -3.0\text{m}$, centered near $X \approx 0$.
  - Foreground action (e.g. market stall, fountain, signpost): placed in front at $Z = +1.0\text{ to } +2.5\text{m}$.
  - Flanking actors: placed beside the foreground action at $|X| \le 1.4\text{m}$, angled inward toward each other and the camera.

### 2. Architectural Enclosures & Shelter Interiors
- When placing characters inside shelters, cabins, vehicles, or rooms:
  - The front wall MUST have an open entrance with tied/rolled flaps or a cutaway view. Never build closed opaque 3D prisms that clip or obscure the camera.
  - Use `side: THREE.DoubleSide` on canvas and wall materials so both exterior and interior surfaces render cleanly.
  - Always place a subtle interior point light (e.g. warm lantern `#ffb050`, intensity 1.0–1.2) inside shelters so characters, furniture, and props are visible under night lighting.

### 3. Emotional Reaction Framing (No Accidental Macro Zooms)
- For emotional reaction beats (shock, terror, realization, laughter):
  - Use a **Medium Close-Up (MCU)**: camera distance $\approx 2.4\text{ to } 3.0\text{m}$ at `fov: 40–44`.
  - Frame the character from waist to head (filling ~60–75% of vertical frame height).
  - This leaves room for posture, shoulder shivering, clutching gestures, and environmental context.
  - Never place the camera closer than 2.0m unless an extreme eyeball-macro insert is explicitly storyboarded.

### 4. Shadow Multipliers & Terrain Contrast
- Shadows must never turn into solid blue puddles.
- Keep sun elevation $\ge 18^\circ$ for sunset (`golden`); elevations below $10^\circ$ cast 80m-long shadow sheets across the entire ground plane.
- In `LIGHTS`, keep `shade` multipliers balanced (`[0.24, 0.22, 0.20]`) and emissive `lift` low (`[0.02, 0.02, 0.03]`).
- Use high-contrast terrain geometry: pair a cool ground albedo (`#424d32`) with a warm packed-earth albedo (`#7a5c3e`) so lit ground and shadowed ground remain distinctly separated.

### 5. Supported Character Expressions & Fallback
- Supported `Expr` types: `"neutral"`, `"stern"`, `"grin"`, `"laugh"`, `"whistle"`, `"nervous"`, `"shock"`, `"fear"`, `"relief"`, `"relief_open"`, `"dazed"`, `"pained"`, `"smile"`, `"smile_closed"`, `"lick"`.
- `"fear"` renders wide terrified shock eyes with trembling chattering teeth (`mouth: "teeth"`).
- The engine enforces fallback to `FACE.neutral` to prevent runtime crashes if an unlisted expression is supplied.

### 6. Compact Drama & Code-Stage Vocabulary
- **All-code stage:** one `kind: "code"` stage component with a `mode` per set, registered once and reused for every shot.
- **Shawshank modes:** `hook`, `yard`, `poster`, `chip`, `breach`, `storm`, `sunrise`.
- **Cast:** `andy`, `andy_wet`, `red`, `guard`; add new outfits to the library, never redraw a character per episode.
- **Actions:** `study_hammer`, `warn`, `listen_grave`, `poster_glance`, `chip_wall`, `triumph`, `free_stand`.
- **Detail cards:** `cellMouth` alpha mask, `tunnelInner`, `chipHole`, `posterTorn`; keep them on separate z planes.
- **Lighting story:** night cell -> overcast yard -> night cell -> night storm -> golden sunrise; the final light change must be paired with a real set change.
- **Kit presets remain available** for generic streets, parks, plazas and wilderness, but a unique story set is usually faster and more consistent as a code stage.

---

## 11. All-Code Stage Case Study: shawshank_hope (50.77 s, 7 shots)

The original reference build is *The Bridge That Fell for a Song* (67 s, Broughton bridge); its full source is preserved in `templates/bridge/` and its script in `templates/SCRIPT_example.md`. The shawshank build is the current compact-drama reference: it avoids plates entirely, adds a small custom cast, and treats ambience as scene-scoped.

### 11.1 Format and pacing
- 1,523 frames, 30 fps, 50.7667 s, 7 shots, 143 words, 2.88 words/s, `+30%` voice rate.
- Scene modes: `hook`, `yard`, `poster`, `chip`, `breach`, `storm`, `sunrise`.
- No captions; the final lesson ends on the last word.
- The hook is a direct proposition, not a joke. The last shot is a second-person takeaway, not a callback punchline.

### 11.2 One cell, seven modes
- Build one cell envelope (`W=1.4`, back wall `z=-1.8`, height `3.6`) and reuse `cellStone`, `cellFloor`, `rustMetal`, `oldWood`, `blanket`, `ticking`.
- Swap dressing and lighting per mode. Reusing the shell gives continuity and keeps the code-stage cost low.
- Storm: water `#5f7b96`, smaller splash rings, culvert `r=0.9` at `x=-2.7` with a light rim and spill. Camera `[0.3,0.56,5.1]` -> target `[0.02,1.5,-0.3]`, fov `42`. A low camera makes rain read in a vertical frame.
- Sunrise: remove the prison slab/fence, place the tree at `(9.5, 0, -24)`, and rebuild the path as one smooth 56-segment ribbon offset right of Andy. Change the set, not just the light, to sell freedom.

### 11.3 Breach: alpha mask, not boolean geometry
- `cellMouth` is a 512x720 jagged alpha-mask card over a painted `tunnelInner` card (`1.46 x 2.0` at `z=back-0.34`).
- Use `alphaTest: 0.5` and `DoubleSide`; keep the tunnel card `fog:false` so the interior stays readable.
- Add 44 rim rocks around the opening (`x≈-0.40..0.81`), and keep rubble on the floor only.
- Torn poster: move to `x=1.22`, tint `#8a8072`, rotate `-0.18`; otherwise its lit edge reads as a golden shard floating in the mouth.
- Transparent-mask cards can punch opaque or black holes when alpha/depth settings are wrong. Verify from the final camera, not the editor.

### 11.4 Silhouette-safe props and poses
- `study_hammer` uses `prop: ["hammer", 0.9]` so the hammer head clears the body silhouette.
- `chip_wall` swings at `0.12 + 0.82 * max(0, sin(t * 6.2))`; the audio hammer hits use the same `6.2` rad/s phase, so picture and SFX land together.
- `triumph` uses `armsUp: 0.92`; `free_stand` uses `armsOut: 0.72` (widened and raised), not a generic wave.
- `armsUp`, `armsOut`, and `headTilt` live in `FrontOpts`; `kickAt` lives in `Shot` for absolute-frame kicks.
- Expression timeline: `912 pained` on "nineteen", `926 stern`; never leave a grin on a grim line. Render the exact frames.

### 11.5 Detail staging
- Chip shot: poster at `x=0.3`; `chipHole` (`0.66 x 0.82`) at `x=-0.16, y=1.06, z=back-0.02` peeks left of the poster. It is a sliver, not a full circle.
- Keep the hole, poster, and tunnel on separate z planes to avoid z-fighting; rubble only on the floor.

### 11.6 Scene-scoped sound
- Rain is an event, not a world bed: only in `rain_freedom` (37.8–42.1 s), with `fades(..., 0.25, 0.12)`. No rain under hook/yard/quiet/chip/storm.
- Storm keeps thunder/wind/whoosh; chip keeps nine hammer hits; sunrise keeps birds/crickets/chime.
- Music ducks under speech. Per-shot SFX loudness fitting is fine, but check raw per-shot integrated levels before setting targets. Removing a loud bed without retuning the normalizer can boost room tone.
- Master to `-15 LUFS / -1.2 dBTP`; limiter GR around 3.6 dB max. `audio.voice` points at the muxed mix.
- Verify ambience with a per-shot 2–8 kHz noise floor (10th percentile), not a waveform eyeball. In `shawshank_hope`, the rain shot read `-39.1 dBFS`; the highest pre-rain shot read `-48.3 dBFS` and sunrise `-48.7 dBFS`. A ~9 dB separation is a clean pass.

### 11.7 QA
- Exact frames `912`, `958`, `1050`, `1241`; check expression, breach, rain, and arms.
- `ffprobe`: 1,523 frames, 50.7667 s, 1080x1920, 30 fps; no captions.
- Audio-only change: remux with `-c:v copy`, verify video MD5 and 0-sample lag.
