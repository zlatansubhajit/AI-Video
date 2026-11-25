import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getToonGradientMap } from "../toon/applyToonPipeline";

export type CharacterExpr =
  | "neutral"
  | "smirk"
  | "wink"
  | "shock"
  | "scheming"
  | "determined"
  | "laugh"
  | "fear"
  | "pained"
  | "grin";

export type CharacterAction =
  | "idle"
  | "walk"
  | "sneak"
  | "dig"
  | "point"
  | "cheer"
  | "brace_plow"
  | "whisper"
  | "study_prop";

export type OutfitPreset =
  | "overalls"
  | "mayor"
  | "villager_red"
  | "villager_green"
  | "villager_blue"
  | "guard";

export type HatPreset = "none" | "straw_hat" | "top_hat" | "cap" | "bonnet";
export type PropPreset =
  | "none"
  | "shovel"
  | "pickaxe"
  | "lantern"
  | "megaphone"
  | "coin_bag"
  | "rock_gold";

export interface ExprKeyframe {
  frame: number;
  expr: CharacterExpr;
}

export interface Character3DProps {
  id: string;
  position: [number, number, number];
  /** Y-axis facing angle in degrees. */
  facing?: number;
  /** Y-axis facing angle in radians (R3F convention). Wins over `facing`. */
  rotationY?: number;
  scale?: number;
  skinColor?: string;
  outfit?: OutfitPreset;
  hat?: HatPreset;
  prop?: PropPreset;
  action?: CharacterAction;
  /** Static expression override for the whole shot. */
  expression?: CharacterExpr;
  exprTimeline?: ExprKeyframe[];
  /** Horizontal eye look offset (-1 left .. +1 right). */
  look?: number;
  /** 0..1 trembling intensity for fear/cold/effort. */
  shiver?: number;
  /** Deterministic phase offset for idle breathing / cycles. */
  seed?: number;
}

const INK_COLOR = "#1a1220";

/** Resolves the active expression at the current frame. */
function resolveExpr(frame: number, timeline?: ExprKeyframe[]): CharacterExpr {
  if (!timeline || timeline.length === 0) return "neutral";
  let current: CharacterExpr = timeline[0].expr;
  for (const kf of timeline) {
    if (frame >= kf.frame) current = kf.expr;
  }
  return current;
}

/** Deterministic Canvas2D comic face renderer (512x512 transparent decal). */
function createFaceTexture(
  expr: CharacterExpr,
  look: number,
  isBlinking: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 512, 512);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK_COLOR;
  ctx.fillStyle = INK_COLOR;

  const lx = look * 14;
  const leftEyeX = 195 + lx;
  const rightEyeX = 317 + lx;
  const eyeY = 230;

  // --- Eyes ---
  const drawEye = (x: number, y: number, isRight: boolean) => {
    if (isBlinking || (expr === "wink" && isRight)) {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x - 24, y);
      ctx.quadraticCurveTo(x, y + 14, x + 24, y);
      ctx.stroke();
      return;
    }

    if (expr === "shock" || expr === "fear") {
      // Wide white sclera + small terrified pupil
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse(x, y, 28, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = INK_COLOR;
      ctx.beginPath();
      ctx.arc(x + lx * 0.25, y, 9, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (expr === "laugh") {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(x, y + 8, 22, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      return;
    }

    // Crisp comic oval dot eyes
    ctx.fillStyle = INK_COLOR;
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEye(leftEyeX, eyeY, false);
  drawEye(rightEyeX, eyeY, true);

  // --- Eyebrows ---
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 13;
  const browY = 178;
  if (expr === "determined" || expr === "scheming") {
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 30, browY - 6);
    ctx.lineTo(leftEyeX + 26, browY + 12);
    ctx.moveTo(rightEyeX + 30, browY - 6);
    ctx.lineTo(rightEyeX - 26, browY + 12);
    ctx.stroke();
  } else if (expr === "smirk" || expr === "wink" || expr === "grin") {
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 26, browY + 4);
    ctx.quadraticCurveTo(leftEyeX, browY - 14, leftEyeX + 24, browY - 4);
    ctx.moveTo(rightEyeX - 24, browY - 12);
    ctx.quadraticCurveTo(rightEyeX, browY - 26, rightEyeX + 26, browY - 8);
    ctx.stroke();
  } else if (expr === "pained" || expr === "fear") {
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 28, browY + 10);
    ctx.lineTo(leftEyeX + 22, browY - 12);
    ctx.moveTo(rightEyeX + 28, browY + 10);
    ctx.lineTo(rightEyeX - 22, browY - 12);
    ctx.stroke();
  } else if (expr === "shock") {
    ctx.beginPath();
    ctx.arc(leftEyeX, browY - 12, 24, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEyeX, browY - 12, 24, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // --- Mouth ---
  const mouthY = 322;
  ctx.lineWidth = 13;
  ctx.strokeStyle = INK_COLOR;

  switch (expr) {
    case "smirk":
    case "wink":
      ctx.beginPath();
      ctx.moveTo(212, mouthY + 6);
      ctx.quadraticCurveTo(262, mouthY + 24, 314, mouthY - 10);
      ctx.stroke();
      break;
    case "grin":
      ctx.beginPath();
      ctx.moveTo(198, mouthY - 4);
      ctx.quadraticCurveTo(256, mouthY + 46, 314, mouthY - 4);
      ctx.stroke();
      break;
    case "scheming":
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(205, mouthY - 4);
      ctx.quadraticCurveTo(256, mouthY + 42, 312, mouthY - 8);
      ctx.quadraticCurveTo(256, mouthY + 10, 205, mouthY - 4);
      ctx.fill();
      ctx.stroke();
      break;
    case "laugh":
      ctx.fillStyle = "#8a2232";
      ctx.beginPath();
      ctx.moveTo(198, mouthY - 10);
      ctx.lineTo(314, mouthY - 10);
      ctx.quadraticCurveTo(256, mouthY + 72, 198, mouthY - 10);
      ctx.fill();
      ctx.stroke();
      break;
    case "shock":
      ctx.fillStyle = "#5c1a24";
      ctx.beginPath();
      ctx.ellipse(256, mouthY + 10, 26, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "fear":
    case "pained":
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(208, mouthY - 10, 96, 36, 14);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(232, mouthY - 10);
      ctx.lineTo(232, mouthY + 26);
      ctx.moveTo(256, mouthY - 10);
      ctx.lineTo(256, mouthY + 26);
      ctx.moveTo(280, mouthY - 10);
      ctx.lineTo(280, mouthY + 26);
      ctx.stroke();
      break;
    case "determined":
      ctx.beginPath();
      ctx.moveTo(218, mouthY + 4);
      ctx.lineTo(294, mouthY + 4);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.moveTo(222, mouthY);
      ctx.quadraticCurveTo(256, mouthY + 16, 290, mouthY);
      ctx.stroke();
      break;
  }

  // Sweat drop on fear / pained
  if (expr === "fear" || expr === "pained") {
    ctx.fillStyle = "#76d4ff";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(392, 148);
    ctx.quadraticCurveTo(416, 195, 392, 212);
    ctx.quadraticCurveTo(368, 195, 392, 148);
    ctx.fill();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Deterministic Canvas2D torso outfit wrap (512x512). */
function createOutfitTexture(outfit: OutfitPreset): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  if (outfit === "overalls") {
    // Plaid shirt base
    ctx.fillStyle = "#d95b43";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "rgba(120, 28, 22, 0.35)";
    for (let i = 0; i < 512; i += 48) {
      ctx.fillRect(i, 0, 14, 512);
      ctx.fillRect(0, i, 512, 14);
    }
    // Denim overalls bib & lower wrap
    ctx.fillStyle = "#3b6598";
    ctx.fillRect(0, 290, 512, 222);
    ctx.fillRect(156, 165, 200, 140);
    // Straps
    ctx.fillRect(166, 0, 34, 180);
    ctx.fillRect(312, 0, 34, 180);
    // Front pocket + brass buttons
    ctx.strokeStyle = "#1d3554";
    ctx.lineWidth = 8;
    ctx.strokeRect(198, 205, 116, 74);
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.arc(183, 182, 11, 0, Math.PI * 2);
    ctx.arc(329, 182, 11, 0, Math.PI * 2);
    ctx.fill();
  } else if (outfit === "mayor") {
    // Charcoal pinstripe suit
    ctx.fillStyle = "#2d3240";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let x = 0; x < 512; x += 28) ctx.fillRect(x, 0, 4, 512);
    // White shirt V + red tie
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.moveTo(200, 60);
    ctx.lineTo(312, 60);
    ctx.lineTo(256, 260);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#cc2936";
    ctx.beginPath();
    ctx.moveTo(244, 70);
    ctx.lineTo(268, 70);
    ctx.lineTo(274, 225);
    ctx.lineTo(256, 255);
    ctx.lineTo(238, 225);
    ctx.closePath();
    ctx.fill();
    // Diagonal gold MAYOR sash
    ctx.save();
    ctx.translate(256, 260);
    ctx.rotate(-0.42);
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(-260, -28, 520, 56);
    ctx.fillStyle = "#1a1220";
    ctx.font = "900 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MAYOR", 0, 2);
    ctx.restore();
  } else {
    const palette: Record<string, [string, string]> = {
      villager_red: ["#c84b31", "#5a3a28"],
      villager_green: ["#4e8c57", "#4a3b2c"],
      villager_blue: ["#4c77a8", "#343b4a"],
      guard: ["#263654", "#1b2233"],
    };
    const [top, belt] = palette[outfit] ?? ["#5f7d99", "#362f2d"];
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, 512, 512);
    // Belt + buckle
    ctx.fillStyle = belt;
    ctx.fillRect(0, 320, 512, 42);
    ctx.fillStyle = "#e6b84c";
    ctx.fillRect(232, 316, 48, 50);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Inverted-hull outline mesh helper for React Three Fiber. */
const OutlineHull: React.FC<{
  geometry: THREE.BufferGeometry;
  thickness?: number;
}> = ({ geometry, thickness = 1.05 }) => (
  <mesh geometry={geometry} scale={thickness}>
    <meshBasicMaterial color={INK_COLOR} side={THREE.BackSide} />
  </mesh>
);

/** 2-segment articulated limb (upper + lower segment with joint bend). */
const ArticulatedLimb: React.FC<{
  position: [number, number, number];
  upperRotX: number;
  upperRotZ: number;
  lowerRotX: number;
  lengthUpper: number;
  lengthLower: number;
  radius?: number;
  color?: string;
  children?: React.ReactNode;
}> = ({
  position,
  upperRotX,
  upperRotZ,
  lowerRotX,
  lengthUpper,
  lengthLower,
  radius = 0.042,
  color = INK_COLOR,
  children,
}) => (
  <group position={position} rotation={[upperRotX, 0, upperRotZ]}>
    <mesh position={[0, -lengthUpper / 2, 0]} castShadow>
      <capsuleGeometry args={[radius, Math.max(0.01, lengthUpper - radius * 2), 6, 10]} />
      <meshBasicMaterial color={color} />
    </mesh>
    <group position={[0, -lengthUpper, 0]} rotation={[lowerRotX, 0, 0]}>
      <mesh position={[0, -lengthLower / 2, 0]} castShadow>
        <capsuleGeometry args={[radius * 0.92, Math.max(0.01, lengthLower - radius * 2), 6, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Hand / Foot terminal */}
      <mesh position={[0, -lengthLower, 0]} castShadow>
        <sphereGeometry args={[radius * 1.45, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <group position={[0, -lengthLower, 0]}>{children}</group>
    </group>
  </group>
);

/** 3D socketed hat renderer. */
const HatSocket: React.FC<{ hat: HatPreset; gradientMap: THREE.DataTexture }> = ({
  hat,
  gradientMap,
}) => {
  if (hat === "none") return null;

  if (hat === "straw_hat") {
    return (
      <group position={[0, 0.24, 0]} rotation={[-0.08, 0, 0.04]}>
        {/* Brim */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.48, 0.52, 0.05, 20]} />
          <meshToonMaterial color="#e8c166" gradientMap={gradientMap} />
        </mesh>
        {/* Crown */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.30, 0.24, 18]} />
          <meshToonMaterial color="#e0b553" gradientMap={gradientMap} />
        </mesh>
        {/* Ribbon */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.305, 0.31, 0.06, 18]} />
          <meshToonMaterial color="#b8382c" gradientMap={gradientMap} />
        </mesh>
      </group>
    );
  }

  if (hat === "top_hat") {
    return (
      <group position={[0, 0.25, 0]} rotation={[-0.05, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.04, 20]} />
          <meshToonMaterial color="#252834" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.22, 0.42, 18]} />
          <meshToonMaterial color="#252834" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.07, 18]} />
          <meshToonMaterial color="#d4a738" gradientMap={gradientMap} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0.22, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.31, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshToonMaterial color="#3c5a80" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.01, 0.26]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.32, 0.04, 0.22]} />
        <meshToonMaterial color="#2a405c" gradientMap={gradientMap} />
      </mesh>
    </group>
  );
};

/** 3D socketed hand prop renderer. */
const HandPropSocket: React.FC<{ prop: PropPreset; gradientMap: THREE.DataTexture }> = ({
  prop,
  gradientMap,
}) => {
  if (prop === "none") return null;

  if (prop === "shovel") {
    return (
      <group rotation={[Math.PI * 0.42, 0, 0]} position={[0, -0.04, 0.12]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.05, 8]} />
          <meshToonMaterial color="#9c6b3b" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.48, 0]} castShadow>
          <boxGeometry args={[0.22, 0.28, 0.04]} />
          <meshToonMaterial color="#8c9ba8" gradientMap={gradientMap} />
        </mesh>
      </group>
    );
  }

  if (prop === "lantern") {
    return (
      <group position={[0, -0.14, 0.08]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.22, 8]} />
          <meshToonMaterial
            color="#ffe082"
            emissive="#ffae33"
            emissiveIntensity={1.4}
            gradientMap={gradientMap}
          />
        </mesh>
        <pointLight color="#ffb84d" intensity={2.2} distance={5} decay={2} />
      </group>
    );
  }

  if (prop === "coin_bag") {
    return (
      <group position={[0, -0.12, 0.08]}>
        <mesh castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshToonMaterial color="#c9a56b" gradientMap={gradientMap} />
        </mesh>
      </group>
    );
  }

  if (prop === "rock_gold") {
    return (
      <group position={[0, -0.06, 0.08]}>
        <mesh castShadow>
          <dodecahedronGeometry args={[0.13, 0]} />
          <meshToonMaterial color="#f5c938" gradientMap={gradientMap} />
        </mesh>
      </group>
    );
  }

  return null;
};

export const Character3D: React.FC<Character3DProps> = ({
  position,
  facing = 0,
  rotationY,
  scale = 1,
  skinColor = "#f7cda8",
  outfit = "overalls",
  hat = "none",
  prop = "none",
  action = "idle",
  expression,
  exprTimeline,
  look = 0,
  shiver = 0,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + seed * 0.37;

  const gradientMap = useMemo(() => getToonGradientMap(3), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.32, 24, 24), []);
  const torsoGeo = useMemo(() => new THREE.CapsuleGeometry(0.24, 0.42, 10, 20), []);

  // Natural 4-frame blink every 96 frames (deterministic per seed)
  const blinkMod = (frame + seed * 29) % 96;
  const isBlinking = blinkMod >= 92;
  const expr = expression ?? resolveExpr(frame, exprTimeline);
  const facingDeg =
    rotationY !== undefined ? THREE.MathUtils.radToDeg(rotationY) : facing;

  const faceTex = useMemo(
    () => createFaceTexture(expr, look, isBlinking),
    [expr, look, isBlinking]
  );
  const outfitTex = useMemo(() => createOutfitTexture(outfit), [outfit]);

  useEffect(() => () => faceTex.dispose(), [faceTex]);
  useEffect(() => () => outfitTex.dispose(), [outfitTex]);

  // --- Deterministic Pose Solver (Pure math on t) ---
  let bodyY = 0.88 + Math.sin(t * 3.1) * 0.016;
  let torsoPitch = 0;
  let headPitch = 0;
  let headYaw = look * 0.18;

  let lArmUpX = 0.08;
  let lArmUpZ = 0.22;
  let lArmLowX = -0.22;
  let rArmUpX = 0.08;
  let rArmUpZ = -0.22;
  let rArmLowX = -0.22;

  let lLegUpX = 0;
  let lLegLowX = 0;
  let rLegUpX = 0;
  let rLegLowX = 0;

  if (action === "walk") {
    const cyc = Math.sin(t * 8.0);
    bodyY = 0.88 + Math.abs(Math.cos(t * 8.0)) * 0.05;
    lLegUpX = cyc * 0.55;
    lLegLowX = Math.max(0, -cyc) * 0.6;
    rLegUpX = -cyc * 0.55;
    rLegLowX = Math.max(0, cyc) * 0.6;
    lArmUpX = -cyc * 0.45;
    rArmUpX = cyc * 0.45;
  } else if (action === "sneak") {
    const cyc = Math.sin(t * 5.2);
    bodyY = 0.74 + Math.abs(Math.cos(t * 5.2)) * 0.03;
    torsoPitch = 0.34;
    headPitch = -0.22;
    lLegUpX = -0.35 + cyc * 0.4;
    lLegLowX = 0.75;
    rLegUpX = -0.35 - cyc * 0.4;
    rLegLowX = 0.75;
    rArmUpX = -0.85;
    rArmLowX = -0.4;
    lArmUpX = -0.45;
  } else if (action === "dig") {
    const swing = Math.sin(t * 6.5);
    torsoPitch = 0.25 + swing * 0.28;
    bodyY = 0.84 - Math.max(0, swing) * 0.06;
    rArmUpX = -0.9 + swing * 0.65;
    rArmLowX = -0.45;
    lArmUpX = -0.8 + swing * 0.55;
    lArmLowX = -0.5;
    lLegUpX = -0.22;
    lLegLowX = 0.38;
    rLegUpX = 0.22;
    rLegLowX = 0.2;
  } else if (action === "cheer") {
    const hop = Math.abs(Math.sin(t * 7.5));
    bodyY = 0.88 + hop * 0.14;
    lArmUpX = -2.55;
    lArmUpZ = 0.42;
    rArmUpX = -2.55;
    rArmUpZ = -0.42;
  } else if (action === "point") {
    rArmUpX = -1.35;
    rArmLowX = -0.1;
    headYaw = look * 0.32;
  } else if (action === "brace_plow") {
    torsoPitch = 0.42;
    bodyY = 0.80;
    lArmUpX = -1.2;
    rArmUpX = -1.2;
    lLegUpX = -0.35;
    lLegLowX = 0.55;
    rLegUpX = 0.45;
  } else if (action === "whisper") {
    torsoPitch = 0.16;
    headYaw = 0.3;
    rArmUpX = -1.1;
    rArmLowX = -1.2;
    rArmUpZ = 0.3;
  }

  // Deterministic shiver micro-jitter
  const shiverX = shiver > 0 ? Math.sin(frame * 2.7 + seed) * 0.018 * shiver : 0;
  const shiverZ = shiver > 0 ? Math.cos(frame * 3.1 + seed) * 0.014 * shiver : 0;

  return (
    <group
      position={[position[0] + shiverX, position[1], position[2] + shiverZ]}
      rotation={[0, THREE.MathUtils.degToRad(facingDeg), 0]}
      scale={scale}
    >
      {/* Legs anchored at pelvis */}
      <group position={[0, bodyY - 0.32, 0]}>
        <ArticulatedLimb
          position={[-0.11, 0, 0]}
          upperRotX={lLegUpX}
          upperRotZ={0.04}
          lowerRotX={lLegLowX}
          lengthUpper={0.28}
          lengthLower={0.28}
        />
        <ArticulatedLimb
          position={[0.11, 0, 0]}
          upperRotX={rLegUpX}
          upperRotZ={-0.04}
          lowerRotX={rLegLowX}
          lengthUpper={0.28}
          lengthLower={0.28}
        />
      </group>

      {/* Upper Body Pivot */}
      <group position={[0, bodyY, 0]} rotation={[torsoPitch, 0, 0]}>
        {/* Torso Capsule */}
        <mesh geometry={torsoGeo} castShadow receiveShadow>
          <meshToonMaterial map={outfitTex} gradientMap={gradientMap} />
        </mesh>
        <OutlineHull geometry={torsoGeo} thickness={1.06} />

        {/* Arms */}
        <ArticulatedLimb
          position={[-0.25, 0.22, 0]}
          upperRotX={lArmUpX}
          upperRotZ={lArmUpZ}
          lowerRotX={lArmLowX}
          lengthUpper={0.25}
          lengthLower={0.24}
        />
        <ArticulatedLimb
          position={[0.25, 0.22, 0]}
          upperRotX={rArmUpX}
          upperRotZ={rArmUpZ}
          lowerRotX={rArmLowX}
          lengthUpper={0.25}
          lengthLower={0.24}
        >
          <HandPropSocket prop={prop} gradientMap={gradientMap} />
        </ArticulatedLimb>

        {/* Head Sphere + Comic Face Decal + 3D Hat */}
        <group position={[0, 0.66, 0]} rotation={[headPitch, headYaw, 0]}>
          <mesh geometry={headGeo} castShadow receiveShadow>
            <meshToonMaterial color={skinColor} gradientMap={gradientMap} />
          </mesh>
          <OutlineHull geometry={headGeo} thickness={1.055} />

          {/* Front-facing spherical patch for crisp 2D face texture */}
          <mesh position={[0, 0, 0.008]}>
            <sphereGeometry
              args={[0.324, 24, 24, -Math.PI * 0.34 + Math.PI * 0.5, Math.PI * 0.68, Math.PI * 0.16, Math.PI * 0.68]}
            />
            <meshBasicMaterial
              map={faceTex}
              transparent
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>

          <HatSocket hat={hat} gradientMap={gradientMap} />
        </group>
      </group>
    </group>
  );
};
