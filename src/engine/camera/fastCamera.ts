import * as THREE from "three";

export type CameraMoveType =
  | "push"
  | "truck"
  | "crane_reveal"
  | "orbit"
  | "creep"
  | "snap_zoom"
  | "whip_pan";

export interface ShotCameraConfig {
  move: CameraMoveType;
  fromPos: [number, number, number];
  toPos?: [number, number, number];
  fromTarget: [number, number, number];
  toTarget?: [number, number, number];
  fov?: number;
  /** Snap zoom multiplier (e.g. 1.38 punches FOV tighter). */
  zoomMultiplier?: number;
  /** Duration in frames for fast transitions (snap_zoom / whip_pan). */
  transitionFrames?: number;
  /** Optional impact shake magnitude (0..1). */
  kick?: number;
  /** Absolute episode frame for impact kick. */
  kickAt?: number;
}

export interface EvaluatedCamera {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

function smootherstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function easeOutBack(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Pure deterministic camera evaluator for Three.js + Remotion.
 */
export function evaluateShotCamera(
  config: ShotCameraConfig,
  episodeFrame: number,
  shotStartFrame: number,
  shotEndFrame: number
): EvaluatedCamera {
  const duration = Math.max(1, shotEndFrame - shotStartFrame);
  const localFrame = Math.max(0, episodeFrame - shotStartFrame);
  const pLinear = Math.min(1, localFrame / duration);
  const pSmooth = smootherstep(pLinear);

  const startPos = new THREE.Vector3(...config.fromPos);
  const endPos = config.toPos ? new THREE.Vector3(...config.toPos) : startPos.clone();
  const startTarget = new THREE.Vector3(...config.fromTarget);
  const endTarget = config.toTarget
    ? new THREE.Vector3(...config.toTarget)
    : startTarget.clone();

  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  let fov = config.fov ?? 42;

  switch (config.move) {
    case "snap_zoom": {
      const snapFrames = config.transitionFrames ?? 6;
      const snapP = easeOutBack(Math.min(1, localFrame / snapFrames));
      const creep = localFrame * 0.0018; // Subtle post-snap drift (never frozen)
      position.lerpVectors(startPos, endPos, Math.min(1.08, snapP));
      target.lerpVectors(startTarget, endTarget, pSmooth);
      const mult = config.zoomMultiplier ?? 1.35;
      fov = fov / (1 + (mult - 1) * snapP + creep);
      break;
    }

    case "whip_pan": {
      const whipFrames = config.transitionFrames ?? 7;
      const whipP = smootherstep(Math.min(1, localFrame / whipFrames));
      position.lerpVectors(startPos, endPos, whipP);
      target.lerpVectors(startTarget, endTarget, whipP);
      // Slight subtle forward creep after pan lands
      const forward = target.clone().sub(position).normalize();
      position.addScaledVector(forward, Math.max(0, localFrame - whipFrames) * 0.004);
      break;
    }

    case "orbit": {
      const radius = startPos.distanceTo(startTarget);
      const startAngle = Math.atan2(
        startPos.x - startTarget.x,
        startPos.z - startTarget.z
      );
      const endAngle = Math.atan2(
        endPos.x - endTarget.x,
        endPos.z - endTarget.z
      );
      const angle = THREE.MathUtils.lerp(startAngle, endAngle, pSmooth);
      const y = THREE.MathUtils.lerp(startPos.y, endPos.y, pSmooth);
      target.lerpVectors(startTarget, endTarget, pSmooth);
      position.set(
        target.x + Math.sin(angle) * radius,
        y,
        target.z + Math.cos(angle) * radius
      );
      break;
    }

    case "creep": {
      position.copy(startPos);
      target.copy(startTarget);
      const dir = target.clone().sub(position).normalize();
      position.addScaledVector(dir, localFrame * 0.008);
      break;
    }

    case "push":
    case "truck":
    case "crane_reveal":
    default: {
      position.lerpVectors(startPos, endPos, pSmooth);
      target.lerpVectors(startTarget, endTarget, pSmooth);
      break;
    }
  }

  // Decaying alternating-sign impact kick over 7 frames
  if (config.kick && config.kick > 0) {
    const kickStart = config.kickAt ?? shotStartFrame;
    const kf = episodeFrame - kickStart;
    if (kf >= 0 && kf < 7) {
      const decay = 1 - kf / 7;
      const sign = kf % 2 === 0 ? 1 : -1;
      const amp = config.kick * decay * 0.14;
      position.x += sign * amp;
      position.y += -sign * amp * 0.65;
    }
  }

  return { position, target, fov };
}
