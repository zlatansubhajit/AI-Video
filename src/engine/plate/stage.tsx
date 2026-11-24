// Runtime plate stage: one full-screen quad that samples a baked colour plate
// through a depth map. Camera translation reprojects each pixel by its own
// depth, so foreground props slide against the sky instead of the whole image
// moving as a card. At the plate's base pose the image is 1:1 with the kit.
//
// The plate capture is display-referred sRGB (it went through the normal post
// chain), so the shader samples and writes it untouched: no colour-space
// conversion, no tone mapping, no ink, no DOF. A plate shot skips PostChain.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { useThree } from "@react-three/fiber";
import { DEPTH_FAR, DEPTH_NEAR } from "./types";

const cache = new Map<string, [THREE.Texture, THREE.Texture]>();
const pending = new Map<string, Promise<[THREE.Texture, THREE.Texture]>>();

const loadTexture = (url: string) =>
  new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.NoColorSpace; // raw sRGB pass-through / raw depth
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        resolve(t);
      },
      undefined,
      reject,
    );
  });

export const loadPlate = (plate: string): Promise<[THREE.Texture, THREE.Texture]> => {
  const key = staticFile(plate);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  let p = pending.get(key);
  if (!p) {
    p = Promise.all([
      loadTexture(staticFile(plate + ".base.png")),
      loadTexture(staticFile(plate + ".depth.png")),
    ]).then((textures) => {
      cache.set(key, textures);
      pending.delete(key);
      return textures;
    });
    pending.set(key, p);
  }
  return p;
};

export const getCachedPlate = (plate: string): [THREE.Texture, THREE.Texture] | null =>
  cache.get(staticFile(plate)) ?? null;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uBase;
uniform sampler2D uDepth;
uniform vec3 uDelta;
uniform float uParallax;
uniform float uTanHalf;
uniform float uAspect;
uniform float uNear;
uniform float uFar;
varying vec2 vUv;

// logarithmic depth, exactly the encoding the capture pass wrote
float viewZ(float d) {
  return uNear * exp(d * log(uFar / uNear));
}

void main() {
  float z = viewZ(texture2D(uDepth, vUv).r);
  vec3 t = uDelta * uParallax;
  float z2 = max(z - t.z, uNear);
  vec2 ndc = vUv * 2.0 - 1.0;
  vec2 ndc2 = vec2(
    (ndc.x * z - t.x / (uTanHalf * uAspect)) / z2,
    (ndc.y * z - t.y / uTanHalf) / z2
  );
  vec2 uv = clamp(ndc2 * 0.5 + 0.5, 0.0, 1.0);
  gl_FragColor = texture2D(uBase, uv);
}`;

export const PlateStage: React.FC<{
  /** Public path without `.base.png` / `.depth.png`. */
  plate: string;
  /** Camera translation since the plate pose, in the plate camera's axes
   *  (x right, y up, z forward). */
  delta: THREE.Vector3;
  fov: number;
  parallax?: number;
  aspect: number;
}> = ({ plate, delta, fov, parallax = 1, aspect }) => {
  const { advance } = useThree();
  const cached = getCachedPlate(plate);
  const [handle] = useState(() => (cached ? null : delayRender("plate " + plate)));
  const [tex, setTex] = useState<[THREE.Texture, THREE.Texture] | null>(cached);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uBase: { value: cached ? cached[0] : null },
          uDepth: { value: cached ? cached[1] : null },
          uDelta: { value: new THREE.Vector3() },
          uParallax: { value: 1 },
          uTanHalf: { value: Math.tan(THREE.MathUtils.degToRad(20)) },
          uAspect: { value: 9 / 16 },
          uNear: { value: DEPTH_NEAR },
          uFar: { value: DEPTH_FAR },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    if (tex) return;
    let live = true;
    loadPlate(plate)
      .then((t) => {
        if (!live) return;
        material.uniforms.uBase.value = t[0];
        material.uniforms.uDepth.value = t[1];
        material.needsUpdate = true;
        setTex(t);
        advance(performance.now());
        if (handle !== null) continueRender(handle);
      })
      .catch((err) => {
        console.error("plate load failed", plate, err);
        cancelRender(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      live = false;
    };
  }, [plate, handle, material, advance, tex]);

  if (tex) {
    material.uniforms.uBase.value = tex[0];
    material.uniforms.uDepth.value = tex[1];
  }
  (material.uniforms.uDelta.value as THREE.Vector3).copy(delta);
  material.uniforms.uParallax.value = parallax;
  material.uniforms.uTanHalf.value = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  material.uniforms.uAspect.value = aspect;

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-100}
      matrixAutoUpdate={false}
    />
  );
};

/** Compute the plate-camera-space translation for a live camera pose. */
export const plateDelta = (
  camera: THREE.PerspectiveCamera,
  basePosition: readonly [number, number, number],
  baseTarget: readonly [number, number, number],
  out = new THREE.Vector3(),
): THREE.Vector3 => {
  const base = new THREE.PerspectiveCamera();
  base.position.set(basePosition[0], basePosition[1], basePosition[2]);
  base.up.set(0, 1, 0);
  base.lookAt(new THREE.Vector3(baseTarget[0], baseTarget[1], baseTarget[2]));
  base.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(base.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(base.matrixWorld, 1);
  const fwd = new THREE.Vector3().setFromMatrixColumn(base.matrixWorld, 2).negate();
  const world = camera.position.clone().sub(base.position);
  return out.set(world.dot(right), world.dot(up), world.dot(fwd));
};
