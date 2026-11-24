// Shot lookup and the camera vocabulary. Six moves, all deterministic and
// frame-addressable: push, pan, truck, crane, orbit, creep. `kick` adds the
// 7-frame impact shake used by the bridge on the same frame clock.
import * as THREE from "three";
import type { CameraMove, EaseName, Episode, Scene, Shot } from "./types";

const UP = new THREE.Vector3(0, 1, 0);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const EASES: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
};

export const shotAt = (episode: Episode, frame: number): Shot => {
  const f = Math.max(0, Math.min(episode.frames - 1, frame));
  for (const shot of episode.shots) {
    if (f >= shot.frames[0] && f < shot.frames[1]) return shot;
  }
  // validateEpisode() rejects gaps; keep the last shot for out-of-range stills.
  return episode.shots[episode.shots.length - 1];
};

export type Pose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  /** Distance from the camera to its look target, used as the DOF focus. */
  focus: number;
};

const amountOf = (m: CameraMove, t: number) => {
  const from = m.from ?? 0;
  const to = m.to ?? 0;
  return from + (to - from) * t;
};

export const cameraPose = (
  scene: Scene,
  shot: Shot,
  frame: number,
  fps: number,
): Pose => {
  const base = scene.camera;
  const pos = new THREE.Vector3(...base.position);
  const target = new THREE.Vector3(...base.target);
  const fov = base.fov ?? 40;

  const [f0, f1] = shot.frames;
  const dur = Math.max(1, f1 - f0);
  const raw = clamp01((frame - f0) / Math.max(1, dur - 1));
  const t = EASES[shot.camera.ease ?? "smoother"](raw);
  const m = shot.camera;
  const amt = amountOf(m, t);
  const seconds = dur / Math.max(1, fps);

  const fwd = target.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();

  switch (m.move) {
    case "push":
      pos.addScaledVector(fwd, amt);
      break;
    case "creep":
      pos.addScaledVector(fwd, (m.speed ?? 0.4) * seconds * t);
      break;
    case "truck":
      pos.addScaledVector(right, amt);
      break;
    case "crane":
      pos.addScaledVector(up, amt);
      break;
    case "pan": {
      const dist = target.distanceTo(pos);
      const dir = fwd.clone().applyAxisAngle(UP, THREE.MathUtils.degToRad(amt));
      target.copy(pos).addScaledVector(dir, dist);
      break;
    }
    case "orbit": {
      if (m.radius != null) {
        const a = THREE.MathUtils.degToRad(amt);
        const y = m.height ?? pos.y - target.y;
        pos.copy(target).add(new THREE.Vector3(Math.sin(a) * m.radius, y, Math.cos(a) * m.radius));
      } else {
        const off = pos.clone().sub(target).applyAxisAngle(UP, THREE.MathUtils.degToRad(amt));
        pos.copy(target).add(off);
      }
      break;
    }
  }

  if (shot.kick) {
    const age = frame - (shot.kickAt ?? f0);
    if (age >= 0 && age < 14) {
      const a = shot.kick * Math.exp(-age / 4);
      pos.x += Math.sin(age * 2.7) * 0.08 * a;
      pos.y += Math.cos(age * 3.4) * 0.06 * a;
    }
  }

  return { position: pos, target, fov, focus: pos.distanceTo(target) };
};

/** Throws on the manifest mistakes that would otherwise render a stuck frame. */
export const validateEpisode = (episode: Episode): Episode => {
  const errs: string[] = [];
  if (!episode.id) errs.push("episode.id is empty");
  if (!Number.isInteger(episode.frames) || episode.frames <= 0) errs.push("episode.frames must be a positive integer");
  if (!episode.shots.length) errs.push("episode has no shots");

  let next = 0;
  episode.shots.forEach((shot, i) => {
    if (!episode.scenes[shot.scene]) errs.push(`shot ${i} references unknown scene "${shot.scene}"`);
    if (shot.frames[0] !== next) errs.push(`shot ${i} starts at ${shot.frames[0]}, expected ${next}`);
    if (shot.frames[1] <= shot.frames[0]) errs.push(`shot ${i} has an empty frame range`);
    next = shot.frames[1];
  });
  if (next !== episode.frames) errs.push(`shots end at frame ${next}, episode.frames is ${episode.frames}`);

  for (const [name, scene] of Object.entries(episode.scenes)) {
    if (!scene.camera?.position || !scene.camera?.target) errs.push(`scene "${name}" has no camera pose`);
    if (scene.kind === "kit" && !scene.preset) errs.push(`kit scene "${name}" has no preset`);
  }

  if (errs.length) throw new Error(`Invalid episode "${episode.id}":\n- ${errs.join("\n- ")}`);
  return episode;
};
