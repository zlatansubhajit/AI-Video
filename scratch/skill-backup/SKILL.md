---
name: cartoon-3d-short
description: Make vertical cartoon 3D story shorts (~15s quick, ~30s short, or ~55-70s full) in the "2D characters in a colourful 3D world" style (flat bean-head cartoon cards with ink outlines, painted 3D world with black ink lines, saturated sky, depth-of-field backgrounds, gliding cameras, neural voiceover, and synchronized SFX/music), rendered with three.js inside Remotion. Covers the complete end-to-end pipeline: scriptwriting, speech alignment, consistent background asset production (3D kit sets, code stages, or 3D-baked 2.5D plates), cast staging, and multi-tier rendering.
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
  ├── Locked Cast Staging (babu, chintu, soldier, worker with actions & props)
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

### Target Formats & Word Count Budget (30 fps)
| Format | Target Length | Frame Count | Word Count | Delivery Rate | Best For |
|---|---|---|---|---|---|
| **Quick Short** | ~14–15 s | 420–450 frames | 35–48 words | +20% to +35% | Viral gags, punchy trivia |
| **30-Second Short** | ~30 s | 880–920 frames | 75–85 words | +18% to +28% | Social shorts, full comedy sketches |
| **Full Story Short** | ~55–70 s | 1650–2100 frames | 180–230 words | +0% to +8% | Documentary history & science |

### Script File Format (`src/episodes/<slug>/SCRIPT.md`)
```markdown
# Episode: hiking_night
Voice: en-US-ChristopherNeural
Rate: +22%
FPS: 30

## Shot: trek_day
Scene: trail_day
Camera: push 0 -> 2.4
Dof: 0
Narration: Two friends, Sam and Leo, headed deep into the wild on an epic mountain hiking trip.

## Shot: trek_evening
Scene: trail_sunset
Camera: truck -0.5 -> 0.8
Dof: 0
Narration: They trekked all day, climbing rocky trails until the golden sun finally sank behind the pines.

## Shot: camp_fire
Scene: camp_fire
Camera: push 0 -> 1.8
Dof: 0
Narration: Exhausted, they pitched their tent and built a warm campfire, laughing under the starry woods.

## Shot: fire_out
Scene: tent_sleep
Camera: creep 0 -> 0.8
Dof: 0
Narration: Soon the fire was completely out, and both fell fast asleep inside the dark tent.

## Shot: wolf_howl
Scene: wolf_howl
Camera: push 0 -> 1.5
Kick: 0.45 on howling
Dof: 0
Narration: In the dead of night, a bloodcurdling wolf howling echoed through the trees!

## Shot: tremble_fear
Scene: fear_tremble
Camera: push 0 -> 1.2
Kick: 0.25 on part
Dof: 2
Narration: Sam snapped wide awake, shivering in absolute terror! More in part two!
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

To ensure the world matches the established 3D cartoon aesthetic (seen in *The Bridge That Fell for a Song* and *The Midnight Howl*), environments must be built or baked using the engine's native three.js systems:

### Background Production Modes (In Order of Preference)

#### Mode 1: Procedural 3D Kit Sets (`kind: "kit"`)
Best for streets, parks, promenades, plazas, wilderness, and weather scenes.
- Assembled from reusable geometric prefabs in `src/engine/kit/`:
  - `woods-camp`: conifer forest, winding dirt hiking trails, open A-frame tent, campfires (active fire or cold charcoal), rocks and boulders.
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
- `sam`: rustic orange outdoor jacket (`#d95f38`), dark trail pants, hiking boots, dark forest green cap (`#2b4a3e`).
- `leo`: deep pine teal hiking jacket (`#2a6858`), khaki cargo trousers, rust red hiking cap (`#8a3a28`).
- `worker`: worker jacket (`#b5653f`), blue pants, boots, cap, hammer prop.
- `officer`: green uniform, shako hat, cross belts.
- `soldier`: soldier uniform, shako hat, cross belts.
- `kid`: kid hoodie, red cap.
- `woman`: townsfolk outfit.
- `man`: townsfolk coat.

### Action Vocabulary:
- `hike`: dynamic walking trail cycle with tilt and look.
- `hike_tired`: slouched weary hike stride under sunset.
- `camp_sit`: sitting relaxedly by the campfire.
- `camp_talk`: sitting, gesturing, and laughing by the fire.
- `sleep_tent`: lying / reclining in tent with breathing cycle.
- `wake_shock`: snapping awake in shock with darting eyes.
- `tremble_fear`: shivering trembling posture with teeth chattering micro-jitter.
- `walk`: steady casual walking stride.
- `work`: hammering / crafting gesture with hammer prop.
- `wave`: friendly greeting wave.
- `cheer`: celebratory jumping and waving.

---

## 7. Step 5: Episode Manifest Assembly

In `src/episodes/<slug>/index.ts`, assemble the data-driven manifest:

```ts
import type { Episode } from "../../engine/shot/types";

export const hikingNight: Episode = {
  id: "hiking-night",
  title: "The Midnight Howl in the Pine Woods",
  fps: 30,
  frames: 889,
  width: 1080,
  height: 1920,
  scenes: {
    trail_day: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "trail" },
      light: "day",
      camera: { position: [0.6, 1.8, 18], target: [0, 1.1, 10], fov: 44 },
    },
    trail_sunset: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "trail_sunset" },
      light: "golden",
      camera: { position: [-1.8, 1.7, 13.5], target: [0, 1.1, 7.5], fov: 42 },
    },
    camp_fire: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "camp_fire" },
      light: "night",
      camera: { position: [0.0, 1.7, 7.0], target: [0.0, 1.0, 0.5], fov: 44 },
    },
    tent_sleep: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "tent_sleep" },
      light: "night",
      camera: { position: [0.1, 1.4, 3.8], target: [0.1, 0.8, -1.0], fov: 42 },
    },
    wolf_howl: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "tent_wolf" },
      light: "night",
      camera: { position: [0.0, 1.3, 2.8], target: [-0.05, 0.8, -1.0], fov: 40 },
    },
    fear_tremble: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "fear_cu" },
      light: "night",
      camera: { position: [-0.15, 1.2, 1.6], target: [-0.15, 0.8, -1.0], fov: 42 },
    },
  },
  shots: [
    {
      scene: "trail_day",
      frames: [0, 144],
      camera: { move: "push", from: 0.0, to: 1.8, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.65, 0.01, 15.0],
          to: [-0.65, 0.01, 11.2],
          facing: 180,
          action: "hike",
          ease: "linear",
        },
        {
          actor: "leo",
          at: [0.65, 0.01, 14.2],
          to: [0.65, 0.01, 10.4],
          facing: 180,
          action: "hike",
          actionOffset: 0.35,
          ease: "linear",
        },
      ],
    },
    {
      scene: "trail_sunset",
      frames: [144, 302],
      light: "golden",
      camera: { move: "truck", from: -0.4, to: 0.6, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.55, 0.01, 10.2],
          to: [-0.55, 0.01, 7.2],
          facing: 180,
          action: "hike_tired",
          ease: "linear",
        },
        {
          actor: "leo",
          at: [0.6, 0.01, 9.4],
          to: [0.6, 0.01, 6.4],
          facing: 180,
          action: "hike_tired",
          actionOffset: 0.25,
          ease: "linear",
        },
      ],
    },
    {
      scene: "camp_fire",
      frames: [302, 453],
      light: "night",
      camera: { move: "push", from: 0.0, to: 1.2, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-1.6, 0.16, 2.2],
          facing: 70,
          action: "camp_talk",
        },
        {
          actor: "leo",
          at: [1.6, 0.16, 2.2],
          facing: -70,
          action: "camp_sit",
        },
      ],
    },
    {
      scene: "tent_sleep",
      frames: [453, 595],
      light: "night",
      camera: { move: "creep", speed: 0.15, ease: "linear" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.35, 0.08, -1.2],
          facing: 0,
          action: "sleep_tent",
        },
        {
          actor: "leo",
          at: [0.35, 0.08, -1.2],
          facing: 0,
          action: "sleep_tent",
        },
      ],
    },
    {
      scene: "wolf_howl",
      frames: [595, 735],
      light: "night",
      camera: { move: "push", from: 0.0, to: 0.9, ease: "smoother" },
      kick: 0.45,
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.25, 0.08, -1.1],
          facing: 15,
          action: "wake_shock",
        },
        {
          actor: "leo",
          at: [0.35, 0.08, -1.2],
          facing: 0,
          action: "sleep_tent",
        },
      ],
    },
    {
      scene: "fear_tremble",
      frames: [735, 889],
      light: "night",
      camera: { move: "push", from: 0.0, to: 0.5, ease: "smoother" },
      kick: 0.25,
      dof: 2,
      cast: [
        {
          actor: "sam",
          at: [-0.15, 0.08, -1.0],
          facing: 10,
          action: "tremble_fear",
          shiver: 0.85,
        },
      ],
    },
  ],
  audio: {
    voice: "audio/hiking_night_voice.mp3",
  },
};
```
```

---

## 8. Step 6: Multi-Tier Verification & Rendering

### Composition Tiers in `Root.tsx`:
- `<slug>Draft`: 540 × 960 (WebGL buffer reduced 4x; super-fast preview rendering).
- `<slug>`: 1080 × 1920 (Full-res final render with post chain: ink, lens blur, bloom, tone mapping, color grade).

### 1. Verify Draft Stills
Render sample frames from each shot to confirm character positions and camera framing:
```bash
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f50.png --frame=50
docker compose run --rm remotion npx remotion still <slug>Draft out/<slug>_f450.png --frame=450
```

### 2. Render Fast 540p Video
```bash
docker compose run --rm remotion npx remotion render src/index.ts <slug>Draft out/<slug>_540p.mp4
```

### 3. Render Final 1080p Video
```bash
docker compose run --rm remotion npx remotion render src/index.ts <slug> out/<slug>_final.mp4 --codec h264 --crf 16
```

---

## 9. Reference Look Targets (The Bridge Standard)

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
  - Use `at` and `to` with `ease` for walking/trekking movement across 3D space.
  - Dynamic facial expressions: use `exprTimeline` to transition expressions on story beats (e.g. from sleeping to shock on a howl).
  - Fear & cold: use `shiver: 0..1` to trigger organic visceral trembling (45 Hz micro-jitter and tilt vibration).
  - Eye tracking: use `look: -1..1` to glance toward dialogue partners or sudden off-screen sounds.
  - Natural 4-frame blinks hide expression swaps seamlessly.
- **Environment Life:**
  - Every set must have living motion: drifting clouds (`cloudField`), moving water ripples, flickering fire with rising embers (`campfire`), or wind-blown weather (`WeatherLayer`).
- **Materials:**
  - ALWAYS use `twoTone` cel shading with `MeshLambertMaterial` and painted canvas textures. NEVER use raw `MeshStandardMaterial`.
- **Depth of Field (DOF Rules):**
  - **Wide & Walking Shots:** ALWAYS set `dof: 0`. Never apply DOF on wide shots, trekking, or landscapes; it blurs characters and scenery together.
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
  - Background anchor (e.g. tent, monument facade, landmark): placed directly in line of sight at $Z = -1.0\text{ to } -3.0\text{m}$, centered near $X \approx 0$.
  - Foreground action (e.g. campfire, fountain, signpost): placed in front at $Z = +1.0\text{ to } +2.5\text{m}$.
  - Flanking actors: placed beside the foreground action at $|X| \le 1.4\text{m}$, angled inward toward each other and the camera.

### 2. Architectural Enclosures & Shelter Interiors
- When placing characters inside shelters, tents, cabins, vehicles, or rooms:
  - The front wall MUST have an open entrance with tied/rolled flaps or a cutaway view. Never build closed opaque 3D prisms that clip or obscure the camera.
  - Use `side: THREE.DoubleSide` on canvas and wall materials so both exterior and interior surfaces render cleanly.
  - Always place a subtle interior point light (e.g. warm lantern `#ffb050`, intensity 1.0–1.2) inside shelters so characters, bedrolls, and props are visible under night lighting.

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
- Use high-contrast terrain geometry: pair moss-forest grass (`#424d32`) with packed earth trail dirt (`#7a5c3e`) so lit ground and shadowed ground remain distinctly separated.

### 5. Supported Character Expressions & Fallback
- Supported `Expr` types: `"neutral"`, `"stern"`, `"grin"`, `"laugh"`, `"whistle"`, `"nervous"`, `"shock"`, `"fear"`, `"relief"`, `"relief_open"`, `"dazed"`, `"pained"`, `"smile"`, `"smile_closed"`, `"lick"`.
- `"fear"` renders wide terrified shock eyes with trembling chattering teeth (`mouth: "teeth"`).
- The engine enforces fallback to `FACE.neutral` to prevent runtime crashes if an unlisted expression is supplied.

### 6. Camping & Wilderness Vocabulary
- **Kit Preset:** `"woods-camp"` with modes:
  - `trail`: day hiking along winding packed dirt trail with conifer pine perimeter.
  - `trail_sunset`: golden hour tired trek through pines.
  - `camp_fire`: cozy night campsite with central campfire and tent centered in background.
  - `tent_sleep`: quiet moonlit campsite with open tent, sleeping friends, and extinguished fire.
  - `tent_wolf`: eerie wolf howl beat with actor jolting awake inside the tent.
  - `fear_cu`: medium close-up of actor trembling in fear inside tent.
- **Prefabs:** `coniferTree`, `rockBoulder`, `tent` (open A-frame), `campfire` (lit flame or cold charcoal embers).
- **Actions:** `hike`, `hike_tired`, `camp_sit`, `camp_talk`, `sleep_tent`, `wake_shock`, `tremble_fear`.
