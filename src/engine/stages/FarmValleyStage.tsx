import React, {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { applyToonPipeline } from "../toon/applyToonPipeline";

export type TimeOfDay = "day" | "golden" | "overcast" | "night";

export interface FarmWorldState {
  /** Number of dug-up holes and dirt mounds scattered across the field (0..60). */
  holesCount?: number;
  /** Growth progress for cornstalks, sunflowers, and pumpkins (0..1). */
  cropHeight?: number;
  /** Lighting and sky palette preset. */
  timeOfDay?: TimeOfDay;
  /** Multi-line text painted onto the foreground wooden signpost. */
  signText?: string;
  /** Toggles warm emissive farmhouse windows and porch lantern light. */
  lanternOn?: boolean;
  /** Windmill rotor angular velocity in radians per second. */
  windmillSpeed?: number;
  /** Controls dry cracked soil appearance when untouched (0..1). */
  soilCrackIntensity?: number;
  /** Deterministic seed for hole placement, crops, and terrain variation. */
  seed?: number;
}

export interface FarmValleyStageProps {
  /** Story-driven world state mutations (driven by episode shot manifest). */
  state?: FarmWorldState;
  /** Draft mode lowers shadow resolution (1024 vs 2048) for fast 540p renders. */
  draft?: boolean;
  /**
   * When true, renders stylized procedural stand-ins (run through applyToonPipeline)
   * instead of loading external .glb assets from public/assets/models/farm/.
   * Set to false once your .glb pack is in place.
   */
  useProceduralFallback?: boolean;
  /** Optional scene children such as Character3D, InstancedCrowd, and DeterministicVFX. */
  children?: React.ReactNode;
}

export const FARM_MODEL_PATHS = {
  farmhouse: "assets/models/farm/farmhouse.glb",
  barn: "assets/models/farm/barn.glb",
  windmill: "assets/models/farm/windmill.glb",
  silo: "assets/models/farm/silo.glb",
  tree: "assets/models/farm/tree_stylized.glb",
  fence: "assets/models/farm/fence.glb",
} as const;

/**
 * Call once in Root.tsx (when useProceduralFallback is false) to warm the GLTF cache
 * before Remotion starts rendering frames.
 */
export function preloadFarmValleyAssets(): void {
  Object.values(FARM_MODEL_PATHS).forEach((relPath) => {
    useGLTF.preload(staticFile(relPath));
  });
}

// ---------------------------------------------------------------------------
// Deterministic Seeded PRNG (Never use Math.random() inside Remotion scenes)
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Lighting & Sky Presets (Aligned with faceless-video-v2 look targets)
// ---------------------------------------------------------------------------
interface LightPreset {
  sunPos: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

const LIGHT_PRESETS: Record<TimeOfDay, LightPreset> = {
  day: {
    sunPos: [14, 22, 16],
    sunColor: "#fff4dc",
    sunIntensity: 1.55,
    hemiSky: "#8ec5ff",
    hemiGround: "#6d5a42",
    hemiIntensity: 0.72,
    skyTop: "#367be0",
    skyHorizon: "#c4def7",
    fogColor: "#c4def7",
    fogNear: 24,
    fogFar: 68,
  },
  golden: {
    // Keep sun elevation >= 20 deg so cast shadows do not blanket the whole terrain
    sunPos: [18, 10.5, 14],
    sunColor: "#ffad5c",
    sunIntensity: 1.65,
    hemiSky: "#ffd39c",
    hemiGround: "#6e4b3c",
    hemiIntensity: 0.65,
    skyTop: "#6d5a8c",
    skyHorizon: "#ffc37a",
    fogColor: "#f2b880",
    fogNear: 22,
    fogFar: 64,
  },
  overcast: {
    sunPos: [10, 24, 12],
    sunColor: "#dbe6f2",
    sunIntensity: 1.1,
    hemiSky: "#b8c7d9",
    hemiGround: "#595c50",
    hemiIntensity: 0.85,
    skyTop: "#7f92a6",
    skyHorizon: "#c6d1dc",
    fogColor: "#c6d1dc",
    fogNear: 20,
    fogFar: 58,
  },
  night: {
    sunPos: [-12, 18, 14],
    sunColor: "#a8c7ff",
    sunIntensity: 0.65,
    hemiSky: "#233663",
    hemiGround: "#141826",
    hemiIntensity: 0.42,
    skyTop: "#090f20",
    skyHorizon: "#1c2c4d",
    fogColor: "#14203a",
    fogNear: 18,
    fogFar: 56,
  },
};

// ---------------------------------------------------------------------------
// Procedural Painted Canvas Textures (Deterministic)
// ---------------------------------------------------------------------------
function createFieldGroundTexture(
  soilCrackIntensity: number,
  tilledRatio: number,
  cropRatio: number,
  seed: number
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const rand = mulberry32(seed + 101);

    // Base meadow green around the outer valley
    ctx.fillStyle = "#5c8c42";
    ctx.fillRect(0, 0, size, size);

    // Subtle painterly grass strokes
    for (let i = 0; i < 650; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const w = 18 + rand() * 44;
      const h = 6 + rand() * 14;
      ctx.fillStyle = rand() > 0.5 ? "rgba(116, 168, 72, 0.35)" : "rgba(64, 108, 44, 0.3)";
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central farm field patch (interpolates from dry hardpan -> dark tilled soil -> fertile loam)
    const dryColor = new THREE.Color("#b89566");
    const tilledColor = new THREE.Color("#6e4b30");
    const lushColor = new THREE.Color("#563d28");
    const fieldColor = dryColor
      .clone()
      .lerp(tilledColor, THREE.MathUtils.clamp(tilledRatio, 0, 1))
      .lerp(lushColor, THREE.MathUtils.clamp(cropRatio * 0.6, 0, 0.6));

    const fx = size * 0.22;
    const fy = size * 0.24;
    const fw = size * 0.56;
    const fh = size * 0.54;

    ctx.fillStyle = `#${fieldColor.getHexString()}`;
    ctx.beginPath();
    ctx.roundRect(fx, fy, fw, fh, 36);
    ctx.fill();

    // Tilled furrow stripes appear as holesCount or cropHeight increase
    const furrowAlpha = Math.max(tilledRatio * 0.5, cropRatio * 0.7);
    if (furrowAlpha > 0.05) {
      ctx.strokeStyle = `rgba(54, 34, 20, ${furrowAlpha.toFixed(2)})`;
      ctx.lineWidth = 10;
      const rows = 14;
      for (let r = 0; r < rows; r++) {
        const ry = fy + 26 + (r / (rows - 1)) * (fh - 52);
        ctx.beginPath();
        ctx.moveTo(fx + 22, ry);
        ctx.lineTo(fx + fw - 22, ry);
        ctx.stroke();
      }
    }

    // Dry hardpan cracks visible early in the story
    const crackAlpha = THREE.MathUtils.clamp(
      soilCrackIntensity * (1 - tilledRatio * 0.85) * (1 - cropRatio),
      0,
      1
    );
    if (crackAlpha > 0.05) {
      ctx.strokeStyle = `rgba(92, 68, 44, ${(crackAlpha * 0.55).toFixed(2)})`;
      ctx.lineWidth = 3;
      for (let c = 0; c < 95; c++) {
        let cx = fx + 24 + rand() * (fw - 48);
        let cy = fy + 24 + rand() * (fh - 48);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const segs = 3 + Math.floor(rand() * 3);
        for (let s = 0; s < segs; s++) {
          cx += (rand() - 0.5) * 46;
          cy += (rand() - 0.5) * 46;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
    }

    // Soft dirt path leading from the porch toward the foreground
    ctx.fillStyle = "rgba(180, 146, 102, 0.72)";
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.16, 48, 120, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createSignTexture(signText: string): THREE.CanvasTexture {
  const width = 512;
  const height = 280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Warm painted wood base
    ctx.fillStyle = "#c99254";
    ctx.fillRect(0, 0, width, height);

    // Horizontal plank seams & wood grain
    ctx.strokeStyle = "#8a5c30";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(110, 70, 34, 0.25)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const y = 14 + i * 19;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.33, y - 4, width * 0.66, y + 4, width, y);
      ctx.stroke();
    }

    // Thick comic border
    ctx.strokeStyle = "#241726";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // Corner nail heads
    const nails: [number, number][] = [
      [28, 28],
      [width - 28, 28],
      [28, height - 28],
      [width - 28, height - 28],
    ];
    ctx.fillStyle = "#3a3640";
    for (const [nx, ny] of nails) {
      ctx.beginPath();
      ctx.arc(nx, ny, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centered bold comic lettering
    const lines = signText.split("\n").map((l) => l.trim()).filter(Boolean);
    const fontSize = lines.length > 2 ? 38 : 44;
    ctx.font = `900 ${fontSize}px "Arial Black", "Impact", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1d1421";

    const lineHeight = fontSize * 1.18;
    const totalHeight = lines.length * lineHeight;
    const startY = (height - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * lineHeight, width - 64);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// ---------------------------------------------------------------------------
// Sky Gradient Dome
// ---------------------------------------------------------------------------
const SkyDome: React.FC<{ topColor: string; horizonColor: string }> = ({
  topColor,
  horizonColor,
}) => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(topColor) },
        uHorizon: { value: new THREE.Color(horizonColor) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          float t = smoothstep(-0.05, 0.55, h);
          gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
        }
      `,
    });
  }, []);

  useEffect(() => {
    material.uniforms.uTop.value.set(topColor);
    material.uniforms.uHorizon.value.set(horizonColor);
  }, [material, topColor, horizonColor]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh scale={[90, 90, 90]}>
      <sphereGeometry args={[1, 24, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// ---------------------------------------------------------------------------
// Foreground Hero Prop: Wooden Signpost
// ---------------------------------------------------------------------------
const WoodenSignpost: React.FC<{
  text: string;
  position?: [number, number, number];
  rotationY?: number;
}> = ({ text, position = [0.05, 0, 1.2], rotationY = -0.08 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const signTex = useMemo(() => createSignTexture(text), [text]);

  useEffect(() => {
    return () => {
      signTex.dispose();
    };
  }, [signTex]);

  useLayoutEffect(() => {
    if (groupRef.current) {
      applyToonPipeline(groupRef.current, {
        outline: true,
        outlineThickness: 0.032,
        outlineColor: "#241726",
        castShadow: true,
        receiveShadow: true,
      });
    }
  }, [signTex]);

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Left & Right wooden stakes */}
      <mesh position={[-0.42, 0.56, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 1.15, 0.1]} />
        <meshLambertMaterial color="#7d522c" />
      </mesh>
      <mesh position={[0.42, 0.54, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 1.12, 0.1]} />
        <meshLambertMaterial color="#7d522c" />
      </mesh>

      {/* Signboard slightly canted for cartoon personality */}
      <group position={[0, 1.05, 0.04]} rotation={[0, 0, 0.035]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.38, 0.76, 0.08]} />
          <meshLambertMaterial color="#a6723e" />
        </mesh>
        {/* Front printed face */}
        <mesh position={[0, 0, 0.042]}>
          <planeGeometry args={[1.34, 0.72]} />
          <meshBasicMaterial map={signTex} />
        </mesh>
        {/* Back printed face (optional for reverse-angle shots) */}
        <mesh position={[0, 0, -0.042]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.34, 0.72]} />
          <meshBasicMaterial map={signTex} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// World Mutation 1: Instanced Dig Craters & Dirt Mounds
// ---------------------------------------------------------------------------
const MAX_HOLES = 60;

const FieldDigCraters: React.FC<{ holesCount: number; seed: number }> = ({
  holesCount,
  seed,
}) => {
  const holeMeshRef = useRef<THREE.InstancedMesh>(null);
  const moundMeshRef = useRef<THREE.InstancedMesh>(null);
  const clampedCount = Math.max(0, Math.min(MAX_HOLES, Math.floor(holesCount)));

  const placements = useMemo(() => {
    const rand = mulberry32(seed + 404);
    const items: {
      x: number;
      z: number;
      radius: number;
      moundAngle: number;
      moundHeight: number;
    }[] = [];

    for (let i = 0; i < MAX_HOLES; i++) {
      // Keep first 3 holes close to the signpost for early story beats
      const spreadX = i < 3 ? 2.4 : 7.8;
      const spreadZ = i < 3 ? 2.2 : 6.4;
      const centerZ = i < 3 ? 0.4 : -0.8;

      let x = (rand() - 0.5) * spreadX * 2;
      let z = centerZ + (rand() - 0.5) * spreadZ * 2;

      // Avoid clipping directly through the signpost base
      if (Math.hypot(x - 0.05, z - 1.2) < 0.75) {
        x += x >= 0 ? 0.9 : -0.9;
      }

      items.push({
        x,
        z,
        radius: 0.32 + rand() * 0.42,
        moundAngle: rand() * Math.PI * 2,
        moundHeight: 0.18 + rand() * 0.24,
      });
    }
    return items;
  }, [seed]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();

    if (holeMeshRef.current && moundMeshRef.current) {
      for (let i = 0; i < MAX_HOLES; i++) {
        if (i < clampedCount) {
          const p = placements[i];
          // Dark recessed pit disc
          dummy.position.set(p.x, 0.015, p.z);
          dummy.rotation.set(-Math.PI / 2, 0, p.moundAngle);
          dummy.scale.set(p.radius, p.radius * 0.88, 1);
          dummy.updateMatrix();
          holeMeshRef.current.setMatrixAt(i, dummy.matrix);

          // Adjacent displaced dirt mound
          const mx = p.x + Math.cos(p.moundAngle) * (p.radius * 0.95);
          const mz = p.z + Math.sin(p.moundAngle) * (p.radius * 0.95);
          dummy.position.set(mx, p.moundHeight * 0.32, mz);
          dummy.rotation.set(0, p.moundAngle, 0);
          dummy.scale.set(p.radius * 0.85, p.moundHeight, p.radius * 0.78);
          dummy.updateMatrix();
          moundMeshRef.current.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.position.set(0, -10, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          holeMeshRef.current.setMatrixAt(i, dummy.matrix);
          moundMeshRef.current.setMatrixAt(i, dummy.matrix);
        }
      }
      holeMeshRef.current.instanceMatrix.needsUpdate = true;
      moundMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [clampedCount, placements]);

  if (clampedCount === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={holeMeshRef}
        args={[undefined, undefined, MAX_HOLES]}
        receiveShadow
      >
        <circleGeometry args={[1, 14]} />
        <meshLambertMaterial color="#382315" />
      </instancedMesh>

      <instancedMesh
        ref={moundMeshRef}
        args={[undefined, undefined, MAX_HOLES]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshLambertMaterial color="#875c38" />
      </instancedMesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// World Mutation 2: Instanced Cornstalks, Sunflowers & Pumpkins
// ---------------------------------------------------------------------------
const CROP_ROWS = 9;
const CROP_COLS = 14;
const TOTAL_STALKS = CROP_ROWS * CROP_COLS;
const TOTAL_PUMPKINS = 24;

const FieldCropRows: React.FC<{
  cropHeight: number;
  seed: number;
  frame: number;
}> = ({ cropHeight, seed, frame }) => {
  const stalkRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const pumpkinRef = useRef<THREE.InstancedMesh>(null);
  const growth = THREE.MathUtils.clamp(cropHeight, 0, 1);

  const cropData = useMemo(() => {
    const rand = mulberry32(seed + 777);
    const stalks: { x: number; z: number; h: number; phase: number }[] = [];
    for (let r = 0; r < CROP_ROWS; r++) {
      for (let c = 0; c < CROP_COLS; c++) {
        const x = -6.8 + (c / (CROP_COLS - 1)) * 13.6 + (rand() - 0.5) * 0.25;
        const z = -6.2 + (r / (CROP_ROWS - 1)) * 9.8 + (rand() - 0.5) * 0.2;
        // Leave a neat clearing around the foreground signpost
        if (Math.hypot(x - 0.05, z - 1.2) < 1.15) continue;
        stalks.push({
          x,
          z,
          h: 1.05 + rand() * 0.55,
          phase: rand() * Math.PI * 2,
        });
      }
    }

    const pumpkins: { x: number; z: number; scale: number; rotY: number }[] = [];
    for (let i = 0; i < TOTAL_PUMPKINS; i++) {
      const x = -5.6 + rand() * 11.2;
      const z = -2.2 + rand() * 5.6;
      if (Math.hypot(x - 0.05, z - 1.2) < 1.2) continue;
      pumpkins.push({
        x,
        z,
        scale: 0.24 + rand() * 0.16,
        rotY: rand() * Math.PI * 2,
      });
    }

    return { stalks, pumpkins };
  }, [seed]);

  useLayoutEffect(() => {
    if (growth <= 0.01) return;
    const dummy = new THREE.Object3D();

    if (stalkRef.current && headRef.current) {
      for (let i = 0; i < TOTAL_STALKS; i++) {
        const s = cropData.stalks[i];
        if (!s) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          stalkRef.current.setMatrixAt(i, dummy.matrix);
          headRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const sway = Math.sin(frame * 0.07 + s.phase) * 0.06 * growth;
        const curH = s.h * growth;

        dummy.position.set(s.x, curH * 0.5, s.z);
        dummy.rotation.set(sway, s.phase, sway * 0.7);
        dummy.scale.set(0.085, curH, 0.085);
        dummy.updateMatrix();
        stalkRef.current.setMatrixAt(i, dummy.matrix);

        // Golden sunflower/corn top blooms once growth > 0.35
        const bloom = THREE.MathUtils.clamp((growth - 0.35) / 0.65, 0, 1);
        dummy.position.set(s.x + sway * curH, curH + 0.08 * bloom, s.z);
        dummy.rotation.set(0.25, s.phase, sway);
        dummy.scale.setScalar(0.22 * bloom);
        dummy.updateMatrix();
        headRef.current.setMatrixAt(i, dummy.matrix);
      }
      stalkRef.current.instanceMatrix.needsUpdate = true;
      headRef.current.instanceMatrix.needsUpdate = true;
    }

    if (pumpkinRef.current) {
      const pumpkinGrowth = THREE.MathUtils.clamp((growth - 0.25) / 0.75, 0, 1);
      for (let i = 0; i < TOTAL_PUMPKINS; i++) {
        const p = cropData.pumpkins[i];
        if (!p || pumpkinGrowth <= 0.01) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          pumpkinRef.current.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const sc = p.scale * pumpkinGrowth;
        dummy.position.set(p.x, sc * 0.72, p.z);
        dummy.rotation.set(0, p.rotY, 0);
        dummy.scale.set(sc * 1.15, sc * 0.85, sc * 1.15);
        dummy.updateMatrix();
        pumpkinRef.current.setMatrixAt(i, dummy.matrix);
      }
      pumpkinRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [growth, frame, cropData]);

  if (growth <= 0.01) return null;

  return (
    <group>
      <instancedMesh
        ref={stalkRef}
        args={[undefined, undefined, TOTAL_STALKS]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.7, 1.0, 1, 6]} />
        <meshLambertMaterial color="#4e9434" />
      </instancedMesh>

      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, TOTAL_STALKS]}
        castShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color="#f5c431" />
      </instancedMesh>

      <instancedMesh
        ref={pumpkinRef}
        args={[undefined, undefined, TOTAL_PUMPKINS]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshLambertMaterial color="#eb7b26" />
      </instancedMesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Mode A: Stylized GLB Kitbash Set (auto-converted via applyToonPipeline)
// ---------------------------------------------------------------------------
interface FarmGLBModelsProps {
  bladeAngle: number;
  lanternOn: boolean;
  onLoaded: () => void;
}

const FarmGLBModels: React.FC<FarmGLBModelsProps> = ({
  bladeAngle,
  lanternOn,
  onLoaded,
}) => {
  const houseGltf = useGLTF(staticFile(FARM_MODEL_PATHS.farmhouse));
  const barnGltf = useGLTF(staticFile(FARM_MODEL_PATHS.barn));
  const windmillGltf = useGLTF(staticFile(FARM_MODEL_PATHS.windmill));
  const siloGltf = useGLTF(staticFile(FARM_MODEL_PATHS.silo));
  const treeGltf = useGLTF(staticFile(FARM_MODEL_PATHS.tree));

  const scenes = useMemo(() => {
    const farmhouse = houseGltf.scene.clone(true);
    const barn = barnGltf.scene.clone(true);
    const windmill = windmillGltf.scene.clone(true);
    const silo = siloGltf.scene.clone(true);
    const treeA = treeGltf.scene.clone(true);
    const treeB = treeGltf.scene.clone(true);

    const heroOpts = {
      outline: true,
      outlineThickness: 0.03,
      outlineColor: "#201628",
      castShadow: true,
      receiveShadow: true,
    };

    applyToonPipeline(farmhouse, heroOpts);
    applyToonPipeline(barn, heroOpts);
    applyToonPipeline(windmill, heroOpts);
    applyToonPipeline(silo, heroOpts);
    // Skip outlines on distant trees so background silhouettes stay clean
    applyToonPipeline(treeA, { ...heroOpts, outline: false });
    applyToonPipeline(treeB, { ...heroOpts, outline: false });

    // Optional warm window emissive toggle on meshes named "*window*"
    farmhouse.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && /window/i.test(obj.name)) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshToonMaterial;
        if (mat && "emissive" in mat) {
          mat.emissive = new THREE.Color(lanternOn ? "#ffbe55" : "#000000");
          mat.emissiveIntensity = lanternOn ? 0.9 : 0;
        }
      }
    });

    const bladesPivot = windmill.getObjectByName("Blades") ||
      windmill.getObjectByName("Rotor") ||
      windmill.getObjectByName("BladesPivot") ||
      null;

    return { farmhouse, barn, windmill, silo, treeA, treeB, bladesPivot };
  }, [houseGltf, barnGltf, windmillGltf, siloGltf, treeGltf, lanternOn]);

  useLayoutEffect(() => {
    if (scenes.bladesPivot) {
      scenes.bladesPivot.rotation.z = bladeAngle;
    }
  }, [scenes, bladeAngle]);

  useLayoutEffect(() => {
    onLoaded();
  }, [onLoaded]);

  return (
    <group>
      <primitive object={scenes.farmhouse} position={[-4.6, 0, -9.8]} rotation={[0, 0.35, 0]} scale={1.15} />
      <primitive object={scenes.barn} position={[5.6, 0, -11.5]} rotation={[0, -0.32, 0]} scale={1.2} />
      <primitive object={scenes.silo} position={[8.6, 0, -12.2]} scale={1.15} />
      <primitive object={scenes.windmill} position={[1.8, 0, -13.5]} rotation={[0, -0.15, 0]} scale={1.25} />
      <primitive object={scenes.treeA} position={[-9.2, 0, -7.8]} scale={1.3} />
      <primitive object={scenes.treeB} position={[9.8, 0, -6.4]} rotation={[0, 1.4, 0]} scale={1.2} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Graceful fallback when the .glb pack is missing or corrupt
// ---------------------------------------------------------------------------
class FarmGLBErrorBoundary extends React.Component<
  {
    fallback: React.ReactNode;
    onFallback: () => void;
    children: React.ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(
      "[FarmValleyStage] .glb assets failed to load; rendering procedural fallback.",
      error
    );
    this.props.onFallback();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Mode B: Stylized Procedural Stand-In Architecture (Zero external assets needed)
// ---------------------------------------------------------------------------
const ProceduralFarmFallback: React.FC<{
  bladeAngle: number;
  lanternOn: boolean;
}> = ({ bladeAngle, lanternOn }) => {
  const rootRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (rootRef.current) {
      applyToonPipeline(rootRef.current, {
        outline: true,
        outlineThickness: 0.03,
        outlineColor: "#201628",
        castShadow: true,
        receiveShadow: true,
      });
    }
  }, [lanternOn]);

  const windowColor = lanternOn ? "#ffd370" : "#5e7f9e";
  const windowEmissive = lanternOn ? "#ffaa33" : "#000000";

  return (
    <group ref={rootRef}>
      {/* Stylized Shingled Farmhouse + Porch */}
      <group position={[-4.2, 0, -9.2]} rotation={[0, 0.32, 0]}>
        {/* Main house walls */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 3.6, 3.4]} />
          <meshLambertMaterial color="#f2e6cf" />
        </mesh>
        {/* Pitched roof */}
        <mesh position={[0, 4.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[3.55, 1.9, 4]} />
          <meshLambertMaterial color="#9c3d32" />
        </mesh>
        {/* Porch deck & awning */}
        <mesh position={[0, 0.22, 2.25]} castShadow receiveShadow>
          <boxGeometry args={[4.5, 0.44, 1.3]} />
          <meshLambertMaterial color="#8f5f36" />
        </mesh>
        <mesh position={[0, 2.45, 2.25]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[4.6, 0.16, 1.55]} />
          <meshLambertMaterial color="#7d3229" />
        </mesh>
        {[-1.9, -0.65, 0.65, 1.9].map((px, i) => (
          <mesh key={i} position={[px, 1.35, 2.75]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 2.0, 8]} />
            <meshLambertMaterial color="#e8decb" />
          </mesh>
        ))}
        {/* Windows */}
        {[-1.2, 1.2].map((wx, i) => (
          <mesh key={i} position={[wx, 2.1, 1.72]}>
            <boxGeometry args={[0.85, 0.9, 0.08]} />
            <meshLambertMaterial
              color={windowColor}
              emissive={windowEmissive}
              emissiveIntensity={lanternOn ? 0.85 : 0}
            />
          </mesh>
        ))}
      </group>

      {/* Red Barn & Silo */}
      <group position={[5.4, 0, -11.0]} rotation={[0, -0.28, 0]}>
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.8, 4.4, 4.2]} />
          <meshLambertMaterial color="#b5332a" />
        </mesh>
        <mesh position={[0, 5.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[3.8, 1.8, 4]} />
          <meshLambertMaterial color="#4c454a" />
        </mesh>
        {/* White barn X-door */}
        <mesh position={[0, 1.3, 2.12]}>
          <boxGeometry args={[1.9, 2.5, 0.1]} />
          <meshLambertMaterial color="#f5efe6" />
        </mesh>
        {/* Grain Silo */}
        <group position={[3.3, 0, -0.5]}>
          <mesh position={[0, 3.1, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.15, 1.2, 6.2, 14]} />
            <meshLambertMaterial color="#c4c2bd" />
          </mesh>
          <mesh position={[0, 6.2, 0]} castShadow>
            <sphereGeometry args={[1.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshLambertMaterial color="#808b96" />
          </mesh>
        </group>
      </group>

      {/* Rotating Farm Windmill */}
      <group position={[1.2, 0, -13.2]} rotation={[0, -0.1, 0]}>
        <mesh position={[0, 3.6, 0]} castShadow>
          <cylinderGeometry args={[0.42, 1.15, 7.2, 8]} />
          <meshLambertMaterial color="#9c7046" />
        </mesh>
        <group position={[0, 6.8, 0.55]} rotation={[0, 0, bladeAngle]}>
          <mesh>
            <cylinderGeometry args={[0.22, 0.22, 0.4, 10]} />
            <meshLambertMaterial color="#403a42" />
          </mesh>
          {[0, 1, 2, 3].map((idx) => (
            <group key={idx} rotation={[0, 0, (idx * Math.PI) / 2]}>
              <mesh position={[0, 1.45, 0]} castShadow>
                <boxGeometry args={[0.48, 2.5, 0.08]} />
                <meshLambertMaterial color="#d4a66a" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* Low-poly Wooden Fence Line */}
      {Array.from({ length: 11 }).map((_, idx) => {
        const fx = -9.5 + idx * 1.9;
        return (
          <group key={idx} position={[fx, 0, -6.5]}>
            <mesh position={[0, 0.55, 0]} castShadow>
              <boxGeometry args={[0.14, 1.1, 0.14]} />
              <meshLambertMaterial color="#8a5d36" />
            </mesh>
            {idx < 10 && (
              <>
                <mesh position={[0.95, 0.82, 0]} castShadow>
                  <boxGeometry args={[1.9, 0.1, 0.08]} />
                  <meshLambertMaterial color="#9e6d42" />
                </mesh>
                <mesh position={[0.95, 0.44, 0]} castShadow>
                  <boxGeometry args={[1.9, 0.1, 0.08]} />
                  <meshLambertMaterial color="#9e6d42" />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Main Stage Export: FarmValleyStage
// ---------------------------------------------------------------------------
export const FarmValleyStage: React.FC<FarmValleyStageProps> = ({
  state,
  draft = false,
  useProceduralFallback = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scene } = useThree();

  const holesCount = state?.holesCount ?? 0;
  const cropHeight = state?.cropHeight ?? 0;
  const timeOfDay: TimeOfDay = state?.timeOfDay ?? "day";
  const signText = state?.signText ?? "THERE IS NO GOLD\nBURIED HERE";
  const lanternOn = state?.lanternOn ?? timeOfDay === "night";
  const windmillSpeed = state?.windmillSpeed ?? 0.9;
  const soilCrackIntensity = state?.soilCrackIntensity ?? 0.85;
  const seed = state?.seed ?? 1337;

  const preset = LIGHT_PRESETS[timeOfDay];
  const shadowSize = draft ? 1024 : 2048;
  const bladeAngle = (frame / fps) * windmillSpeed;

  // `<color attach="background">` / `<fog attach="fog">` only bind to the
  // scene when they are direct children of it. Set them imperatively so the
  // stage behaves the same at any nesting depth.
  useLayoutEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;
    scene.background = new THREE.Color(preset.skyHorizon);
    scene.fog = new THREE.Fog(preset.fogColor, preset.fogNear, preset.fogFar);
    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
    };
  }, [
    scene,
    preset.skyHorizon,
    preset.fogColor,
    preset.fogNear,
    preset.fogFar,
  ]);

  // Deterministic asset gate: hold Remotion frame capture until .glb kit mounts
  const [renderHandle] = useState<number | null>(() =>
    useProceduralFallback ? null : delayRender("Loading FarmValleyStage GLB models")
  );
  const resolvedRef = useRef(false);

  const handleModelsLoaded = useMemo(
    () => () => {
      if (renderHandle !== null && !resolvedRef.current) {
        resolvedRef.current = true;
        continueRender(renderHandle);
      }
    },
    [renderHandle]
  );

  // Safety cleanup in case stage unmounts before load finishes
  useEffect(() => {
    return () => {
      if (renderHandle !== null && !resolvedRef.current) {
        resolvedRef.current = true;
        continueRender(renderHandle);
      }
    };
  }, [renderHandle]);

  const groundTexture = useMemo(() => {
    const tilledRatio = THREE.MathUtils.clamp(holesCount / 36, 0, 1);
    return createFieldGroundTexture(soilCrackIntensity, tilledRatio, cropHeight, seed);
  }, [soilCrackIntensity, holesCount, cropHeight, seed]);

  useEffect(() => {
    return () => {
      groundTexture.dispose();
    };
  }, [groundTexture]);

  return (
    <group name="FarmValleyStage">
      <SkyDome topColor={preset.skyTop} horizonColor={preset.skyHorizon} />

      {/* Primary Lighting Rig */}
      <hemisphereLight
        args={[preset.hemiSky, preset.hemiGround, preset.hemiIntensity]}
      />
      <directionalLight
        position={preset.sunPos}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />

      {/* Warm Porch / Night Lantern Practical Light */}
      {lanternOn && (
        <pointLight
          position={[-3.2, 2.2, -6.5]}
          color="#ffb357"
          intensity={timeOfDay === "night" ? 6.5 : 2.2}
          distance={16}
          decay={2}
        />
      )}

      {/* Valley Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
        <planeGeometry args={[52, 52]} />
        <meshLambertMaterial map={groundTexture} />
      </mesh>

      {/* Rolling Background Hills (Unoutlined so foreground characters pop) */}
      <group position={[0, -0.4, -24]}>
        <mesh position={[-14, 0, 0]} scale={[15, 5.2, 10]} receiveShadow>
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshLambertMaterial color="#588f45" />
        </mesh>
        <mesh position={[4, 0, -4]} scale={[18, 6.4, 12]} receiveShadow>
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshLambertMaterial color="#4d8242" />
        </mesh>
        <mesh position={[18, 0, 1]} scale={[14, 4.6, 9]} receiveShadow>
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshLambertMaterial color="#5d944a" />
        </mesh>
      </group>

      {/* Stateful World Mutations */}
      <FieldDigCraters holesCount={holesCount} seed={seed} />
      <FieldCropRows cropHeight={cropHeight} seed={seed} frame={frame} />
      <WoodenSignpost text={signText} />

      {/* Architecture Set (.glb Kitbash or Procedural Stand-In) */}
      {useProceduralFallback ? (
        <ProceduralFarmFallback bladeAngle={bladeAngle} lanternOn={lanternOn} />
      ) : (
        <FarmGLBErrorBoundary
          onFallback={handleModelsLoaded}
          fallback={
            <ProceduralFarmFallback
              bladeAngle={bladeAngle}
              lanternOn={lanternOn}
            />
          }
        >
          <Suspense fallback={null}>
            <FarmGLBModels
              bladeAngle={bladeAngle}
              lanternOn={lanternOn}
              onLoaded={handleModelsLoaded}
            />
          </Suspense>
        </FarmGLBErrorBoundary>
      )}

      {/* Episode Cast, InstancedCrowd, and DeterministicVFX */}
      {children}
    </group>
  );
};

export default FarmValleyStage;
