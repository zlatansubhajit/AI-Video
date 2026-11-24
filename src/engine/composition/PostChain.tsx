// The shared post chain, in the bridge's proven order:
//   Ink -> lens blur pre + main (DOF) -> bloom (emissive only) + Neutral tone
//   -> colour grade. MSAA at the composer.
// Plates skip this whole chain (their look is baked); kit/glb scenes use it.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../look/ink";
import { LensBlur } from "../look/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../look/grade";
import type { LightName, Tier } from "../shot/types";

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

/** Bloom for emissive sources only; its mip chain always starts at 540x960 so
 *  the glow keeps the same size relative to the frame at any output width. */
const makeBloom = (levels: number) => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

export type PostToggles = { ink?: boolean; lens?: boolean; pre?: boolean; bloom?: boolean; grade?: boolean; grain?: boolean };

export const PostChain: React.FC<{
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  light: LightName;
  /** blur-disc radius at infinity, px at 1080x1920; 0 disables DOF */
  dof: number;
  /** focus distance along the view axis, metres */
  focus: number;
  tier: Tier;
  toggles?: PostToggles;
  /** world root that must not receive ink outlines on its unlit layers */
  world: THREE.Object3D;
}> = ({ scene, camera, light, dof, focus, tier, toggles, world }) => {
  const on = useMemo(() => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...toggles }), [toggles]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera),
    lens: new LensBlur({ maxCoC: tier === "draft" ? 14 : 24, nearScale: 1.2 }),
    bloom: makeBloom(tier === "draft" ? 4 : 6),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: null as null,
  }), [camera, scene, tier]);

  useEffect(() => () => {
    const ink = fx.ink as unknown as { dispose?: () => void; disposePass?: () => void };
    if (typeof ink.dispose === "function") ink.dispose();
    else if (typeof ink.disposePass === "function") ink.disposePass();
  }, [fx]);

  noInkFallback(world);
  fx.lens.focus = Math.max(0.3, focus);
  fx.lens.cInf = dof;
  gradeFor(fx.grade, light);

  const useLens = on.lens && dof >= 0.25 && tier !== "draft";
  return (
    <EffectComposer multisampling={tier === "draft" ? 2 : 4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {useLens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {useLens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
    </EffectComposer>
  );
};
