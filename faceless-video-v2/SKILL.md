---
name: faceless-video-v2
description: Produce high-retention vertical 3D cartoon story shorts (35-60s) featuring cel-shaded 3D capsule characters with crisp 2D comic face/outfit textures, stylized low-poly .glb environments with progressive world-state mutations, instanced crowds, deterministic 3D VFX, fast camera grammar (snap-zooms, whip-pans, prop inserts), synced kinetic word captions, and neural voiceover + sound design — rendered deterministically via Three.js + Remotion inside Docker.
---

# Faceless Video v2 Pipeline (Three.js + Remotion + Docker)

## 1. Overview & Core Philosophy

`faceless-video-v2` produces fast-paced, high-detail vertical animated explainers, fables, and comedy shorts where **3D cel-shaded capsule characters with crisp 2D vector faces and 3D props perform inside stylized, stateful low-poly 3D worlds**.

### The Four Foundational Rules
1. **Audio Dictates Visual Beats (Fast Cut Density):** Speech cadence, emphasis words, and comedic beats drive cuts. High-retention shorts average **1.5–3.0 seconds per shot** (16–24 shots per 45–50s short), including mid-sentence reaction cuts, cutaway reveals, and macro prop inserts. Visual kicks and overlay callouts land **0–2 frames before** the impact word.
2. **Unified Toon Visual Grammar (`applyToonPipeline`):** Every imported `.glb` environment asset and procedural mesh MUST pass through `applyToonPipeline()` so lighting, 3-band toon shading, directional soft shadows, and selective inverted-hull outlines unify all models into a single cohesive art style. Never mix raw PBR/photorealistic shaders or external AI-generated raster backgrounds into the 3D scene.
3. **100% Deterministic Frame Rendering:** Remotion renders frames concurrently across headless Chromium workers. **Never** use `Math.random()`, `Date.now()`, or Three.js `useFrame((state, delta) => ...)` time accumulation. Every limb angle, particle trajectory, cloud drift, and crowd cycle MUST be a pure function of `(frame, fps, seed)`.
4. **Stateful Worlds Over Static Copies:** Build one detailed `.glb`-kitbashed stage per location and mutate it via a `worldState` prop (e.g., `holesCount`, `cropHeight`, `timeOfDay`, `signText`) so viewers feel tangible physical progression across the story.

---

## 2. Complete End-to-End Pipeline

```
[1. Story & Hook] ──> [2. SCRIPT.md] ──> [3. align_voice_timing.py] ──> public/audio/<slug>_voice.mp3
                                                                        public/audio/<slug>_words.json
                                                                        public/audio/<slug>_timeline.json
                                                                                       │
  ┌────────────────────────────────────────────────────────────────────────────────────┘
  ▼
[4. Detailed 3D World & Asset Prep]
  ├── Mode 0 (Default): Stylized .glb Kitbash (public/assets/models/) + applyToonPipeline()
  ├── Mode 1: Procedural 3D Code Stages (for unique hero props/macro inserts)
  └── World State Mutations (holes, weather, crops, timeOfDay, props)
  ▼
[5. Cast, Crowds & VFX Staging (src/episodes/<slug>/index.ts)]
  ├── Character3D (3D capsule/sphere + 2D Canvas face/outfit + 3D hats/tools + 2-bone limbs)
  ├── InstancedCrowd (30-100+ villagers via THREE.InstancedMesh, zero-lag deterministic cycles)
  ├── DeterministicVFX (SmokePoof, DirtBurst, PaintFlakes, CoinStack)
  └── Fast Camera Grammar (snap_zoom, whip_pan, crane_reveal, push, truck, orbit + kicks)
  ▼
[6. 2D Kinetic Overlays]
  ├── <WordCaptions /> (1-2 word bold stroked captions synced to _words.json)
  └── <ComicCallouts /> (pop-up badges like "$1", "7 DAYS" synced to exact word timestamps)
  ▼
[7. Pre-Bundled Docker Render & QA]
  ├── One-time Bundle (remotion bundle -> ./build) to avoid recopying heavy .glb assets
  ├── Keyframe Still Checks (remotion still ./build <slug>Draft --frame=N)
  └── Multi-Tier Render (540p draft -> 1080p final, GPU ANGLE or tuned CPU SwANGLE)
```

---

## 3. Step 1: High-Retention Script & Beat Formula

### High-Retention Fable / Explainer Beat Formula (45–50 s)
1. **Visual Paradox Hook (0–4 s, 2 shots):** Open on an absurd visual or question (*"Why did a whole town dig up one farmer's field?"*) with an immediate camera push or wide-to-tight snap.
2. **The Problem / Setup (4–12 s, 3–4 shots):** Establish the protagonist, setting, and physical obstacle (dry soil, empty wallet, stubborn wall) using expressive facial close-ups and props.
3. **The Clever Scheme (12–22 s, 4–5 shots):** Show the character hatching the plan in action — night sneaking, painting a fake prop, planting a rumor — punctuated by `whip_pan` or `snap_zoom`.
4. **Escalation & Crowd Chaos (22–34 s, 4–6 shots):** Pull back to an elevated crane/aerial shot revealing the `InstancedCrowd` swarming the world; layer numeric `<ComicCallouts />` (`$1`, `7 DAYS`).
5. **The Twist / Reveal (34–42 s, 3–4 shots):** Macro prop insert (e.g., gold paint flaking off a rock) or sudden `SmokePoof` reveal showing the trick.
6. **Payoff & Punchline (42–50 s, 2–3 shots):** Show the mutated final `worldState` (lush crops, overflowing coin stack) and end cleanly on a sly wink or dry punchline.

### Target Formats & Pacing Budgets (30 fps)
| Format | Target Length | Shots | Avg Cut | Word Count | Voice Rate | Captions |
|---|---|---|---|---|---|---|
| **Quick Gag** | 15–20 s | 6–9 | 2.0 s | 45–60 | +20% to +30% | ON |
| **High-Retention Fable (Default)** | 45–52 s | 16–24 | 2.2 s | 125–155 | +15% to +25% | ON |
| **Deep Explainer / Drama** | 55–68 s | 18–26 | 2.6 s | 165–205 | +10% to +18% | ON |

### Extended Script File Format (`src/episodes/<slug>/SCRIPT.md`)
Each shot may declare `State:`, `VFX:`, `Overlay:`, and `Crowd:` directives alongside `Camera:` and `Kick:`. Mid-sentence cuts are explicitly supported using `CutAt:` when a fast visual gag needs to interrupt a single spoken sentence.

```markdown
# Episode: clever_farmer
Voice: en-US-ChristopherNeural
Rate: +20%
FPS: 30
Captions: on

## Shot: hook_wide
Scene: farm_valley
State: { holes: 42, cropHeight: 0, time: "day" }
Crowd: { count: 40, action: "dig" }
Camera: crane_reveal 0 -> 1
Narration: Why did an entire town pay to dig up one broke farmer's field?

## Shot: farmer_dry_soil
Scene: farm_valley
State: { holes: 0, cropHeight: 0, time: "day" }
Camera: snap_zoom 1.0 -> 1.35
Kick: 0.25 on broke
Narration: His dirt was rock hard, and he was completely broke.

## Shot: night_rumor
Scene: farm_valley
State: { holes: 1, cropHeight: 0, time: "night" }
Camera: whip_pan left -> right
Overlay: "GOLD?" on gold
Narration: So one night, he buried a painted rock and whispered one word to the mayor: gold.

## Shot: crowd_frenzy
Scene: farm_valley
State: { holes: 48, cropHeight: 0, time: "day" }
Crowd: { count: 55, action: "dig" }
Camera: truck -1.2 -> 1.2
Overlay: "$1" on dollar | "7 DAYS" on seven
VFX: dirt_burst on digging
Narration: He charged one dollar a shovel. For seven days straight, nobody stopped digging.

## Shot: paint_flake_insert
Scene: rock_macro_insert
Camera: push 0 -> 0.8
VFX: paint_flakes on flaked
Narration: By the time the gold paint finally flaked off...

## Shot: harvest_payoff
Scene: farm_valley
State: { holes: 0, cropHeight: 1.0, time: "golden" }
Camera: snap_zoom 1.0 -> 1.25
VFX: smoke_poof on farmer | coin_stack on rich
Narration: The whole field was plowed for free, and the farmer was rich.
```

---

## 4. Step 2: Voice Synthesis & Word-Level Alignment

Run the voice alignment tool inside Docker:

```bash
docker compose run --rm remotion python3 scripts/align_voice_timing.py \
  --input src/episodes/<slug>/SCRIPT.md \
  --episode <slug> \
  --rate "+20%" \
  --hold-frames 18 \
  --out-dir public/audio
```

This generates:
- `public/audio/<slug>_voice.mp3` — synthesized neural narration.
- `public/audio/<slug>_words.json` — word timestamps from the aligner (`{ word, start_s, end_s }`). `<WordCaptions />` normalizes these seconds to frames and also accepts `{ word, startFrame, endFrame }`; use the same timestamps to derive `<ComicCallouts />` frames and beat-synced VFX triggers.
- `public/audio/<slug>_timeline.json` — frame-accurate shot boundaries using midpoint pause cuts:
  $$F_{\text{cut}} = \text{round}\left( \frac{t_{\text{end}} + t_{\text{start}}}{2} \times \text{fps} \right)$$
  and anticipated visual impacts/overlays:
  $$F_{\text{kick}} = \max(F_{\text{start}}, \text{round}(t_{\text{word}} \times \text{fps}) - 2)$$

---

## 5. Step 3: Detailed Environments (`.glb` Kitbashing + Auto-Toon)

To achieve lush, handcrafted cartoon worlds (shingled farmhouses, windmills, barns, silos, gazebos, picket fences, sunflowers, cobbled town squares) without brittle raw Three.js boxes:

### Mode 0 (Default): Stylized `.glb` Kit Sets (`kind: "glb-kit"`)
1. Store curated low-poly `.glb` models in `public/assets/models/<pack>/` (e.g., `farmhouse.glb`, `windmill.glb`, `barn.glb`, `sunflower.glb`, `pine_tree.glb`, `wooden_sign.glb`).
2. Preload every `.glb` inside a deterministic `delayRender()` wrapper (`useGLTF.preload(staticFile(...))`) so headless Chromium never captures blank frames.
3. Run `applyToonPipeline(clonedScene, options)` from `src/engine/toon/applyToonPipeline.ts` inside `useMemo`:
   - Replaces PBR `MeshStandardMaterial` with 3-band `MeshToonMaterial` using a crisp nearest-neighbor `DataTexture` gradient map.
   - Preserves diffuse textures, vertex colors, and alpha cutouts.
   - Adds **selective inverted-hull outlines** (`side: THREE.BackSide`, `#1a1220`, scale `1.025–1.04`) to hero architecture and props, while omitting outlines on ground planes, distant hills, and dense foliage (`outline: false` or mesh name tags like `ground`, `terrain`, `leaf`, `grass`).
   - Enables `castShadow` and `receiveShadow` cleanly for `PCFSoftShadowMap`.

### World State Mutations (`worldState`)
Every recurring stage component MUST accept a typed `worldState` object so the environment transforms physically across beats:
- **Terrain Mutations:** Toggle crater decals / extruded dirt mounds based on `holesCount` (`0 -> 50`).
- **Growth / Decay:** Scale crop/sunflower/cornstalk instanced meshes smoothly via `cropHeight` (`0 -> 1`).
- **Lighting Moods:** Swap lighting rigs dynamically via `time: "day" | "golden" | "overcast" | "night"` (adding warm lantern point lights and glowing window emissives during `night`).

### Mode 1: Macro Prop Inserts (`kind: "insert"`)
For punchy 1–2 second cutaway beats (flaking painted rock, piling gold coins, slamming a stamp, ticking clock):
- Build a tight, shallow-DOF mini-stage focused solely on the hero 3D prop + `DeterministicVFX` (e.g., `PaintFlakes` or `CoinStack`). No full cast required.

---

## 6. Step 4: Characters (`Character3D`) & Instanced Crowds

### `Character3D` (`src/engine/cast3d/Character3D.tsx`)
Replaces flat 2D billboard cards with stylized 3D "pill-people" that hold up under orbits, low angles, and snap-zooms:
- **Geometry:** `SphereGeometry` head + `CapsuleGeometry` torso + 2-segment articulated arms and legs (shoulder/elbow and hip/knee pivots) with toon shading and inverted-hull outlines.
- **2D Comic Textures:** Uses deterministic `CanvasTexture` generators for:
  - **Face Decal Patch:** Mapped cleanly to the front of the sphere with `polygonOffset`. Supports `neutral`, `smirk`, `wink`, `shock`, `scheming`, `determined`, `laugh`, `fear`, `pained`, eye gaze (`look: -1..1`), and automatic 4-frame blinks every ~95 frames.
  - **Outfit Wrap:** Crisp painted overalls with pockets/buttons, pinstripe mayor suit + `"MAYOR"` sash, farmer plaid, villager tunics, guard uniforms.
- **3D Socket Accessories:** Built-in sockets on `headTop` (`straw_hat`, `top_hat`, `cap`, `bonnet`, `none`) and `rightHand` (`shovel`, `pickaxe`, `megaphone`, `lantern`, `rock_gold`, `coin_bag`, `none`).
- **Actions (Pure Frame Functions):** `idle`, `walk`, `sneak`, `dig`, `point`, `cheer`, `brace_plow`, `whisper`, `study_prop`.

### `InstancedCrowd` (`src/engine/cast3d/InstancedCrowd.tsx`)
When a beat calls for 20–80 townsfolk digging, cheering, or lining up:
- Uses `THREE.InstancedMesh` (bodies, heads, hats, and held shovels) driven by a Mulberry32 seeded PRNG.
- Supports exclusion rectangles (`avoidZones`) so crowd members never clip inside barns or hero characters.
- Offsets every villager's animation phase deterministically by instance index so the crowd feels alive without any frame-to-frame jitter.

---

## 7. Step 5: Fast Camera Grammar, VFX & Kinetic Overlays

### Camera Moves (`src/engine/camera/fastCamera.ts`)
- `push` / `truck` / `orbit` / `creep`: Standard smooth glides (never leave a completely frozen hold; apply minimum `creep`).
- `snap_zoom`: Fast 5–6 frame ease-out-back punch-in (e.g. `1.0 -> 1.38`) on comedic reactions or shocking reveals.
- `whip_pan`: Rapid 6-frame horizontal swing from `fromTarget` to `toTarget` linking two characters or beats seamlessly.
- `crane_reveal`: Elevated pull-back (`elevation > 25°`) revealing crowd scale across the full vertical frame.
- `kick` + `kickAt`: High-frequency decaying camera shake triggered at an absolute episode frame.

### Deterministic 3D VFX (`src/engine/vfx/DeterministicVFX.tsx`)
- `SmokePoof`: Stylized toon spheres puffing outward and shrinking cleanly over 18 frames (disguise switches, magical reveals, impact bursts).
- `DirtBurst`: Parabolic clod arcs synced to shovel impacts.
- `PaintFlakes`: Thin gold/metallic shards peeling and tumbling off a macro insert prop.
- `CoinStack`: Spring-dropped gold coins stacking rapidly on a surface.

### 2D Remotion Overlays (`src/engine/overlays/WordCaptions.tsx`)
Layered cleanly over `<ThreeCanvas>` inside `<AbsoluteFill>`:
- `<WordCaptions words={wordsJson} highlightWords={["broke", "gold", "free", "rich"]} />`: Renders 1–2 words per beat in heavy bold uppercase sans-serif (`Montserrat` / `Impact` / `Inter Black`), thick `#000000` outer stroke, crisp drop shadow, and a 3-frame Remotion `spring()` scale pop. Positioned in the safe lower-middle zone (`bottom: 22%`) above YouTube Shorts UI chrome.
- `<ComicCallouts callouts={episode.callouts} />`: High-contrast comic badges (`$1`, `7 DAYS`, `FREE`) popping in on exact word frames with slight tilt and spring overshoot.

---

## 8. Step 6: Episode Manifest Assembly (`src/episodes/<slug>/index.ts`)

> **Repo integration note:** the v2 engine files are a toolkit. This repository's
> current manifest renderer (`src/engine/composition/Episode.tsx`) still consumes
> the v1 `Episode` contract from `src/engine/shot/types.ts`; the `EpisodeV2` shape
> below is the target schema for the v2 components, not a registered composition
> yet. Until a v2 renderer is added, build each episode as a bespoke composition
> (`src/episodes/<slug>/index.tsx`) that mounts `<FarmValleyStage>`,
> `<Character3D>`, `<InstancedCrowd>`, and `<DeterministicVFX>` inside
> `<ThreeCanvas>`, then layers `<WordCaptions>` / `<ComicCallouts>` over it in an
> `<AbsoluteFill>`. Use `evaluateShotCamera()` from `fastCamera.ts` to drive the
> camera from the shot table. A copy-ready skeleton is in
> `templates/episode_v2_composition.tsx`.

```ts
import type { EpisodeV2 } from "../../engine/shot/types";

export const cleverFarmer: EpisodeV2 = {
  id: "clever-farmer",
  title: "Why a Whole Town Dug One Farmer's Field",
  fps: 30,
  frames: 1440,
  width: 1080,
  height: 1920,
  audio: {
    mix: "audio/clever_farmer_mix.mp3",
    wordsJson: "audio/clever_farmer_words.json",
  },
  captions: {
    enabled: true,
    maxWordsPerChunk: 2,
    highlightWords: ["broke", "gold", "dollar", "seven", "free", "rich"],
  },
  callouts: [
    { text: "GOLD?", startFrame: 412, durationFrames: 36, color: "#ffd53d", position: [0.5, 0.28] },
    { text: "$1", startFrame: 615, durationFrames: 42, color: "#58e66c", position: [0.28, 0.30] },
    { text: "7 DAYS", startFrame: 702, durationFrames: 48, color: "#ff5a5f", position: [0.72, 0.30] },
  ],
  shots: [
    {
      id: "hook_wide",
      stage: "farm_valley",
      frames: [0, 96],
      worldState: { holes: 42, cropHeight: 0, time: "day" },
      camera: {
        move: "crane_reveal",
        fromPos: [0, 3.2, 7.5],
        toPos: [0.6, 8.8, 13.5],
        fromTarget: [0, 0.8, 0],
        toTarget: [0, 0.4, -1.0],
        fov: 44,
      },
      crowd: {
        count: 42,
        seed: 1042,
        bounds: [-6.5, 6.5, -7.5, 4.5],
        avoidZones: [{ x: 0, z: -5.5, radius: 3.0 }],
        action: "dig",
      },
      cast: [
        {
          id: "farmer",
          outfit: "overalls",
          hat: "straw_hat",
          prop: "none",
          at: [0, 0, 2.2],
          facing: 12,
          action: "idle",
          exprTimeline: [{ frame: 0, expr: "smirk" }],
        },
      ],
    },
    {
      id: "crowd_frenzy",
      stage: "farm_valley",
      frames: [580, 790],
      worldState: { holes: 48, cropHeight: 0, time: "day" },
      camera: {
        move: "truck",
        fromPos: [-2.2, 4.5, 9.2],
        toPos: [2.2, 4.5, 9.2],
        fromTarget: [0, 0.8, -1.0],
        toTarget: [0, 0.8, -1.0],
        fov: 42,
      },
      kick: 0.3,
      kickAt: 615,
      crowd: {
        count: 55,
        seed: 2026,
        bounds: [-7.0, 7.0, -8.0, 5.0],
        action: "dig",
      },
      vfx: [
        { type: "dirt_burst", at: [-1.2, 0.1, 1.5], startFrame: 620, seed: 7 },
        { type: "dirt_burst", at: [1.5, 0.1, 0.4], startFrame: 650, seed: 19 },
      ],
      cast: [
        {
          id: "farmer",
          outfit: "overalls",
          hat: "straw_hat",
          prop: "coin_bag",
          at: [0.4, 0, 3.8],
          facing: -18,
          action: "cheer",
          exprTimeline: [
            { frame: 580, expr: "smirk" },
            { frame: 690, expr: "laugh" },
          ],
        },
      ],
    },
  ],
};
```

---

## 9. Step 7: Pre-Bundled Docker Rendering & QA

Because `.glb` packs make `public/` large, **bundle once into `./build`** before taking stills or rendering video. Never let `remotion still` re-bundle and recopy `public/` on every frame check.

### 1. Bundle Once
```bash
docker compose run --rm remotion npx remotion bundle src/index.ts --out-dir ./build
```

### 2. Render Story-Beat Stills (540p Draft)
Inspect exact beat frames (hook, snap-zoom peaks, VFX triggers, crowd wide shots, callout frames):
```bash
docker compose run --rm remotion npx remotion still ./build <slug>Draft out/<slug>_f20.png --frame=20 --gl=swangle
docker compose run --rm remotion npx remotion still ./build <slug>Draft out/<slug>_f620.png --frame=620 --gl=swangle
```

### 3. Render Fast 540p Preview
```bash
docker compose run --rm remotion npx remotion render ./build <slug>Draft out/<slug>_540p.mp4 \
  --gl=swangle --concurrency=4
```

### 4. Render Final 1080p Video
- **With NVIDIA GPU (Recommended — 5–10x faster for `.glb` shadows & crowds):**
```bash
docker compose --profile gpu run --rm remotion-gpu npx remotion render ./build <slug> out/<slug>_final.mp4 \
  --gl=angle --angle-renderer=egl --codec h264 --crf 16 --concurrency=4
```
- **CPU-Only Fallback (SwANGLE):**
```bash
docker compose run --rm remotion npx remotion render ./build <slug> out/<slug>_final.mp4 \
  --gl=swangle --codec h264 --crf 16 --concurrency=4
```

### 5. Audio-Only Remux & Deliverable Check
When tweaking sound effects or music ducking after picture lock, copy the video stream directly:
```bash
docker compose run --rm remotion ffmpeg -y -i out/<slug>_final.mp4 \
  -i public/audio/<slug>_mix.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest \
  -movflags +faststart out/<slug>_final_remux.mp4
```
Verify `1080x1920`, `30 fps`, zero dropped frames via `ffprobe`, and loudness around `-14 to -15 LUFS / -1.0 dBTP` via `ebur128`.

---

## 10. Visual Look & Staging Rules (v2 Standards)

### 1. Selective Inverted-Hull Outlines & Shadow Quality
- **Outlines:** Apply inverted-hull outlines (`#1a1220`) to characters, hats, props, and hero buildings. Disable outlines on ground planes, sky domes, clouds, and dense leaf cards so the image stays clean and readable.
- **Shadows:** Enable `PCFSoftShadowMap` with `shadow-mapSize={[2048, 2048]}` (final) and `[1024, 1024]` (540p Draft). Keep sun elevation $\ge 22^\circ$ for golden hour so terrain shadows never flood the ground plane.
- **Sky & Atmosphere:** Use vibrant vertical gradient sky domes (rich cerulean `#3892e8` to warm cream horizon `#d8ecff` for day; deep cobalt `#0d1836` with a bright moon disc for night).

### 2. Vertical 9:16 Framing & Elevation Rule
- **Eye-Level Shots (`elevation <= 20°`):** Keep hero actors within $|X| \le 1.4\text{m}$ at $Z \le 5\text{m}$ to avoid horizontal edge clipping.
- **Elevated / Aerial Crowd Shots (`elevation > 25°`):** Relax the $|X|$ constraint so instanced crowds and environmental landmarks fill the entire 9:16 vertical plane cleanly from bottom foreground to upper horizon.
- **Caption Safe Zone:** Keep hero faces above the bottom 30% of the frame whenever `<WordCaptions />` is active so text never covers character mouths.

### 3. Preloading & Chromium Stability
- Always mount `shm_size: "2gb"` in Docker so headless Chromium does not crash under WebGL canvas allocations.
- Always wrap `.glb` and `CanvasTexture` initialization in Remotion's `delayRender` / `continueRender` lifecycle so frame 0 renders with 100% loaded geometry and textures.
