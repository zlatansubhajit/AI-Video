import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "../../engine/look/ink";
import { LensBlur, GrainEffect } from "../../engine/look/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../../engine/look/grade";
import { Kit } from "./build";
import { SHOTS, dofAt } from "./story";

// Ensure NeutralToneMapping GLSL chunk is available across all Three.js releases
if (!THREE.ShaderChunk.tonemapping_pars_fragment.includes("NeutralToneMapping")) {
  THREE.ShaderChunk.tonemapping_pars_fragment += `
vec3 NeutralToneMapping(vec3 color) {
  const float StartCompression = 0.76;
  const float Desaturation = 0.15;
  color *= toneMappingExposure;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < StartCompression) return color;
  float d = 1.0 - StartCompression;
  float newPeak = StartCompression + d * smoothstep(0.0, 1.0, (peak - StartCompression) / d);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (Desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
`;
}

export const FAST_TOTAL_FRAMES = 450; // 15 seconds at 30 fps

type FastBeat = { id: number; start: number; end: number; origBase: number };
const BEATS: FastBeat[] = [
  { id: 3, start: 0, end: 110, origBase: 295 },     // Beat 1: Walking across
  { id: 5, start: 110, end: 220, origBase: 535 },   // Beat 2: Dancing in sync
  { id: 8, start: 220, end: 340, origBase: 990 },   // Beat 3: The bridge wobbles!
  { id: 14, start: 340, end: 450, origBase: 1745 }, // Beat 4: Safe on the bank
];

const fastShotAt = (f: number): { id: number; origF: number } => {
  const cur = BEATS.find((b) => f >= b.start && f < b.end) ?? BEATS[BEATS.length - 1];
  return { id: cur.id, origF: cur.origBase + (f - cur.start) };
};

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({
  ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false,
  ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {})
});

const makeBloom = () =>
  new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("bridge kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; origF: number; kit: Kit }> = ({ id, origF, kit }) => {
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
  }), [camera, scene]);

  useEffect(() => () => {
    if (typeof fx.ink?.dispose === "function") {
      fx.ink.dispose();
    } else if (typeof (fx.ink as any)?.disposePass === "function") {
      (fx.ink as any).disposePass();
    }
  }, [fx]);

  const post = useMemo(() => (
    <EffectComposer multisampling={2}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);

  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, origF, cam, scene));
  noInkFallback(world.root);

  const d = dofAt(origF);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(origF)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = origF;

  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

export const DancingBridgeFast: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const kit = useKit();
  if (!kit) return null;
  const cur = fastShotAt(f);
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <ThreeCanvas
        width={width}
        height={height}
        {...(dprOverride() ? { dpr: dprOverride() } : {})}
        shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 1500 }}
      >
        <Inner id={cur.id} origF={cur.origF} kit={kit} />
      </ThreeCanvas>
      <Audio src={staticFile("audio/voice_fast.mp3")} />
    </AbsoluteFill>
  );
};
