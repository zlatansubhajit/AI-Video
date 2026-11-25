# Faceless Video v2 (`faceless-video-v2`)

A deterministic Three.js + Remotion + Docker pipeline for 35–60 s high-retention vertical cartoon story shorts: cel-shaded 3D capsule characters with crisp 2D comic faces and 3D props, stylized low-poly `.glb` worlds with progressive state mutations, instanced crowds, deterministic 3D VFX, fast camera grammar, kinetic word captions, and neural voiceover + SFX — rendered completely locally with zero AI video generators.

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | Complete `faceless-video-v2` pipeline, beat formulas, staging rules, and Docker render workflow |
| `docker-compose.yml` (repo root) | CPU (`swangle`) and GPU (`angle/egl`) Docker services with pre-built bundle mounts and 2 GB `/dev/shm` |
| `src/engine/toon/applyToonPipeline.ts` | Converts any `.glb` or Three.js group into unified 3-band toon shading + selective inverted-hull outlines |
| `src/engine/cast3d/Character3D.tsx` | 3D capsule/sphere actor with Canvas2D face/outfit textures, 2-segment articulated limbs, and 3D hat/prop sockets |
| `src/engine/cast3d/InstancedCrowd.tsx` | Deterministic `THREE.InstancedMesh` crowd system for 30–100+ animated villagers |
| `src/engine/vfx/DeterministicVFX.tsx` | Pure frame-driven `SmokePoof`, `DirtBurst`, `PaintFlakes`, and `CoinStack` 3D VFX |
| `src/engine/camera/fastCamera.ts` | Deterministic camera rig supporting `snap_zoom`, `whip_pan`, `crane_reveal`, `push`, `truck`, `orbit`, and kicks |
| `src/engine/stages/FarmValleyStage.tsx` | Stateful `.glb`-kitbashed farm stage with `worldState` mutations, deterministic gLTF gating, and a procedural fallback |
| `src/engine/overlays/WordCaptions.tsx` | Kinetic `<WordCaptions />` and `<ComicCallouts />` synced to `edge-tts` `_words.json` |
| `public/assets/models/` | Curated low-poly stylized `.glb` environment & prop packs (auto-tooned at load time) |
| `templates/` | Legacy v1 reference builds (`bridge/`), audio mix/ducking toolkit, script examples, and `episode_v2_composition.tsx` (copy-ready v2 composition skeleton) |

## Quick Start
1. Copy this folder into your agent's skills directory (for OpenCode: `~/.config/opencode/skills/faceless-video-v2/` globally, or `.agents/skills/faceless-video-v2/` inside this project). The engine code itself lives in the repo under `src/engine/`; this skill folder ships the docs, reference frames, and templates.
2. Drop low-poly `.glb` environment/prop kits into `public/assets/models/`. Until they exist, render `FarmValleyStage` with `useProceduralFallback={true}` (or let its GLB error boundary fall back automatically).
3. Bundle once before running stills or renders so heavy `.glb` packs are not recopied into `REMOTION_TMP`:
   ```bash
   docker compose run --rm remotion npx remotion bundle src/index.ts --out-dir ./build
   ```
4. Ask your agent to invoke `faceless-video-v2` and create a short on your chosen topic.

## License
MIT (see `LICENSE`).
