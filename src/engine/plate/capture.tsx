// Plate generation from the kit. The colour pass is a real EpisodeVideo render
// (ink, bloom, tone and grade baked in, no cast, no DOF) so a plate matches a
// kit still by construction. The depth pass renders the same kit and camera
// with an override material that encodes linear depth into the red channel.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { EpisodeVideo } from "../composition/Episode";
import { KIT_PRESETS } from "../kit/presets";
import type { Episode } from "../shot/types";
import { DEPTH_FAR, DEPTH_NEAR, PLATE_HEIGHT, PLATE_WIDTH, type PlateSpec } from "./types";

const synthetic = (spec: PlateSpec): Episode => ({
  id: "plate-capture",
  frames: 1,
  scenes: {
    main: {
      kind: "kit",
      preset: spec.preset,
      options: spec.options,
      light: spec.light,
      sun: spec.sun,
      camera: spec.camera,
    },
  },
  shots: [{ scene: "main", frames: [0, 1], camera: { move: "pan", from: 0, to: 0 }, dof: 0 }],
});

/** Colour plate: a normal kit render with the cast and DOF stripped. */
export const PlateCapture: React.FC<{ spec: PlateSpec }> = ({ spec }) => {
  const episode = useMemo(() => synthetic(spec), [spec]);
  return <EpisodeVideo episode={episode} />;
};

const depthMat = () => new THREE.ShaderMaterial({
  uniforms: { uNear: { value: DEPTH_NEAR }, uFar: { value: DEPTH_FAR } },
  vertexShader: /* glsl */ `
    varying float vZ;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vZ = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform float uNear;
    uniform float uFar;
    varying float vZ;
    void main() {
      // logarithmic depth: near = 0, far = 1, constant relative precision
      float d = clamp(log(max(vZ, uNear) / uNear) / log(uFar / uNear), 0.0, 1.0);
      gl_FragColor = vec4(vec3(d), 1.0);
    }`,
});

const DepthStage: React.FC<{ spec: PlateSpec }> = ({ spec }) => {
  const { scene, camera } = useThree();
  const { width, height } = useVideoConfig();
  const cam = camera as THREE.PerspectiveCamera;
  const kit = useMemo(() => {
    const preset = KIT_PRESETS[spec.preset];
    if (!preset) throw new Error(`Plate spec: unknown kit preset "${spec.preset}"`);
    return preset(spec.weather ? { ...(spec.options ?? {}), weather: spec.weather } : spec.options);
  }, [spec]);
  const mat = useMemo(depthMat, []);
  scene.overrideMaterial = mat;
  scene.background = new THREE.Color(1, 1, 1);
  const c = spec.camera;
  cam.position.set(...c.position);
  cam.up.set(0, 1, 0);
  cam.lookAt(new THREE.Vector3(...c.target));
  cam.fov = c.fov ?? 40;
  cam.aspect = width / height;
  cam.near = DEPTH_NEAR;
  cam.far = DEPTH_FAR;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return <primitive object={kit.root} dispose={null} />;
};

/** Depth plate: white where the ray escapes (background = far). */
export const PlateDepth: React.FC<{ spec: PlateSpec }> = ({ spec }) => (
  <ThreeCanvas
    width={PLATE_WIDTH}
    height={PLATE_HEIGHT}
    shadows={false}
    gl={{
      antialias: false,
      stencil: false,
      powerPreference: "high-performance",
      toneMapping: THREE.NoToneMapping,
      outputColorSpace: THREE.LinearSRGBColorSpace,
    }}
    camera={{ fov: spec.camera.fov ?? 40, near: DEPTH_NEAR, far: DEPTH_FAR }}
  >
    <DepthStage spec={spec} />
  </ThreeCanvas>
);
