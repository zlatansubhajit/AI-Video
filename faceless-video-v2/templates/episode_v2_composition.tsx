// Bespoke faceless-video-v2 composition template.
// Copy to `src/episodes/<slug>/index.tsx`, then replace SHOTS, CALLOUTS and the
// audio paths. Register it in `src/Root.tsx` with a <Composition>.
//
// This template deliberately uses the procedural farm fallback so it renders
// before any .glb pack exists. Set `useProceduralFallback={false}` once
// `public/assets/models/farm/*.glb` is populated.
import React from "react";
import * as THREE from "three";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  FarmValleyStage,
  type FarmWorldState,
} from "../../engine/stages/FarmValleyStage";
import {
  Character3D,
  type CharacterAction,
  type CharacterExpr,
  type HatPreset,
  type OutfitPreset,
  type PropPreset,
} from "../../engine/cast3d/Character3D";
import { InstancedCrowd } from "../../engine/cast3d/InstancedCrowd";
import {
  CoinStack,
  DirtBurst,
  PaintFlakes,
  SmokePoof,
} from "../../engine/vfx/DeterministicVFX";
import {
  ComicCallouts,
  WordCaptions,
  type ComicCallout,
} from "../../engine/overlays/WordCaptions";
import {
  evaluateShotCamera,
  type ShotCameraConfig,
} from "../../engine/camera/fastCamera";

type CastDef = {
  id: string;
  outfit?: OutfitPreset;
  hat?: HatPreset;
  prop?: PropPreset;
  at: [number, number, number];
  facing?: number;
  action?: CharacterAction;
  expression?: CharacterExpr;
  look?: number;
  shiver?: number;
  seed?: number;
};

type VfxDef =
  | { type: "dirt_burst"; at: [number, number, number]; startFrame: number; seed?: number }
  | { type: "smoke_poof"; at: [number, number, number]; startFrame: number; seed?: number }
  | { type: "paint_flakes"; at: [number, number, number]; startFrame: number; seed?: number; color?: string }
  | { type: "coin_stack"; at: [number, number, number]; startFrame: number; count?: number };

type ShotDef = {
  /** Absolute episode frames, [start, end). */
  frames: [number, number];
  state: FarmWorldState;
  camera: ShotCameraConfig;
  cast?: CastDef[];
  crowd?: {
    count: number;
    seed: number;
    bounds: [number, number, number, number];
    action?: "dig" | "cheer" | "idle";
  };
  vfx?: VfxDef[];
};

const SHOTS: ShotDef[] = [
  {
    frames: [0, 90],
    state: { holesCount: 42, cropHeight: 0, timeOfDay: "day", seed: 1337 },
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
      action: "dig",
    },
    cast: [
      {
        id: "farmer",
        outfit: "overalls",
        hat: "straw_hat",
        at: [0, 0, 2.2],
        facing: 12,
        action: "idle",
        expression: "smirk",
        seed: 7,
      },
    ],
  },
  {
    frames: [90, 180],
    state: { holesCount: 0, cropHeight: 1, timeOfDay: "golden", seed: 1337 },
    camera: {
      move: "snap_zoom",
      fromPos: [0.4, 2.6, 6.4],
      toPos: [0.4, 2.2, 4.6],
      fromTarget: [0.4, 1.1, 2.2],
      toTarget: [0.4, 1.1, 2.2],
      fov: 42,
      zoomMultiplier: 1.25,
    },
    cast: [
      {
        id: "farmer",
        outfit: "overalls",
        hat: "straw_hat",
        prop: "coin_bag",
        at: [0.4, 0, 2.2],
        facing: -12,
        action: "cheer",
        expression: "laugh",
        seed: 7,
      },
    ],
    vfx: [
      { type: "coin_stack", at: [0.9, 0, 2.5], startFrame: 120, count: 10 },
      { type: "smoke_poof", at: [0.4, 0.2, 2.2], startFrame: 150, seed: 4 },
    ],
  },
];

const CALLOUTS: ComicCallout[] = [
  { text: "GOLD?", startFrame: 12, durationFrames: 30, color: "#ffd53d", position: [0.5, 0.26] },
  { text: "FREE", startFrame: 120, durationFrames: 36, color: "#58e66c", position: [0.7, 0.3] },
];

export const EPISODE_FRAMES = SHOTS[SHOTS.length - 1].frames[1];

const CameraRig: React.FC<{ shot: ShotDef }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const pose = evaluateShotCamera(
    shot.camera,
    frame,
    shot.frames[0],
    shot.frames[1]
  );
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(pose.position);
  cam.up.set(0, 1, 0);
  cam.lookAt(pose.target);
  cam.fov = pose.fov;
  cam.updateProjectionMatrix();
  return null;
};

const ShotVfx: React.FC<{ vfx: VfxDef }> = ({ vfx }) => {
  switch (vfx.type) {
    case "dirt_burst":
      return <DirtBurst position={vfx.at} startFrame={vfx.startFrame} seed={vfx.seed} />;
    case "smoke_poof":
      return <SmokePoof position={vfx.at} startFrame={vfx.startFrame} seed={vfx.seed} />;
    case "paint_flakes":
      return (
        <PaintFlakes
          position={vfx.at}
          startFrame={vfx.startFrame}
          seed={vfx.seed}
          color={vfx.color}
        />
      );
    case "coin_stack":
      return <CoinStack position={vfx.at} startFrame={vfx.startFrame} count={vfx.count} />;
  }
};

const ActiveShot: React.FC<{ shot: ShotDef }> = ({ shot }) => (
  <FarmValleyStage state={shot.state} useProceduralFallback>
    <CameraRig shot={shot} />

    {shot.cast?.map((c) => (
      <Character3D
        key={c.id}
        id={c.id}
        position={c.at}
        outfit={c.outfit}
        hat={c.hat}
        prop={c.prop}
        facing={c.facing}
        action={c.action}
        expression={c.expression}
        look={c.look}
        shiver={c.shiver}
        seed={c.seed}
      />
    ))}

    {shot.crowd ? (
      <InstancedCrowd
        count={shot.crowd.count}
        seed={shot.crowd.seed}
        bounds={shot.crowd.bounds}
        action={shot.crowd.action}
      />
    ) : null}

    {shot.vfx?.map((v, i) => (
      <ShotVfx key={i} vfx={v} />
    ))}
  </FarmValleyStage>
);

export const CleverFarmer: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shot =
    SHOTS.find((s) => frame >= s.frames[0] && frame < s.frames[1]) ??
    SHOTS[SHOTS.length - 1];

  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: 44, near: 0.2, far: 200 }}
      >
        <ActiveShot shot={shot} />
      </ThreeCanvas>

      <Audio src={staticFile("audio/clever_farmer_voice.mp3")} />
      <WordCaptions
        wordsUrl="audio/clever_farmer_words.json"
        maxWordsPerChunk={2}
        highlightWords={["gold", "free", "rich"]}
      />
      <ComicCallouts callouts={CALLOUTS} />
    </AbsoluteFill>
  );
};
