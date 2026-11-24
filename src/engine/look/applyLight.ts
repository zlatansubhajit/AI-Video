// One light rig for every kit scene. Mirrors the frozen bridge's lighting
// contract: the sun is camera-relative and frozen per shot, the world uses
// two-tone shading, character cards read CHAR, and fog follows the horizon.
import * as THREE from "three";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import type { LightName, SunOverride } from "../shot/types";

export type LightRig = {
  group: THREE.Group;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  fog: THREE.Fog;
  sunDir: THREE.Vector3;
};

export const createLightRig = (quality: "draft" | "final" = "final"): LightRig => {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
  const sun = new THREE.DirectionalLight("#fff0d6", 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "draft" ? 2048 : 4096, quality === "draft" ? 2048 : 4096);
  const fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
  group.add(hemi, sun, sun.target, fill, fill.target);
  return { group, hemi, sun, fill, fog: new THREE.Fog("#bccbec", 25, 420), sunDir: new THREE.Vector3(0.5, 0.75, -0.4).normalize() };
};

const fwd = new THREE.Vector3();

/** Applies the preset and re-fits the sun/shadows for this camera pose.
 *  `focus` is the camera's look target. Returns the direction TOWARD the sun. */
export const applyLight = (
  rig: LightRig,
  name: LightName,
  camera: THREE.PerspectiveCamera,
  focus: THREE.Vector3,
  opts: SunOverride = {},
): THREE.Vector3 => {
  const L: LightPreset = LIGHTS[name];
  const K = LOOK[name];
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
  fwd.normalize();
  const az = THREE.MathUtils.degToRad(opts.az ?? L.az);
  const el = THREE.MathUtils.degToRad(opts.el ?? L.el);
  // screen right = (-fz, fx)
  const hx = fwd.x * Math.cos(az) - fwd.z * Math.sin(az);
  const hz = fwd.z * Math.cos(az) + fwd.x * Math.sin(az);
  rig.sunDir.set(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();

  rig.hemi.color.set(L.sky); rig.hemi.groundColor.set(L.ground); rig.hemi.intensity = L.hemiI;
  rig.sun.color.set(L.sunCol); rig.sun.intensity = L.sunI;
  rig.fill.intensity = 0;

  TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
  TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
  TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
  CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
  CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);

  const dist = camera.position.distanceTo(focus);
  let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
  if (name === "golden" || name === "night") Rr = Math.max(Rr, 30);
  rig.sun.position.copy(focus).addScaledVector(rig.sunDir, 220);
  rig.sun.target.position.copy(focus);
  const sc = rig.sun.shadow.camera;
  sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
  rig.sun.shadow.bias = L.bias;
  rig.sun.shadow.normalBias = L.normalBias * (Rr / 12);

  rig.fog.color.copy(untone(L.fog));
  rig.fog.near = L.fogNear; rig.fog.far = L.fogFar;
  return rig.sunDir;
};
