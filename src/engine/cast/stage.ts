// Runtime cast layer for manifest episodes. Resolves each CastCall into a
// billboard card (front/side, mirrored, tiered by distance), binds it to the
// shared canvas pool and lays a soft contact blob underfoot.
import * as THREE from "three";
import { bodyFront, bodySide, fxContact, fxShadow, Expr, FrontOpts, SideOpts, Pen } from "./toon";
import { LIGHTS } from "../look/lights";
import type { CastCall, LightName } from "../shot/types";
import { ACTIONS, CAST } from "./library";
import { Actor, Fx, Pool } from "./pool";
import { EASES } from "../shot/runtime";

const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const tmp = new THREE.Vector3();

/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

/** front/side view and mirroring for someone at (x,z) moving along (dx,dz) */
const viewOf = (cam: THREE.Camera, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.position.x - x, tz = cam.position.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  return { side: c < 0.57, mirror: dx * right.x + dz * right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps */
const light2D = (cam: THREE.Camera, mirror: boolean, sun: THREE.Vector3) => {
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const sx = sun.dot(right) * (mirror ? -1 : 1), sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

const CONTACT: Record<LightName, [number, number, number]> = {
  day: [0.2, 0.21, 0.33],
  golden: [0.24, 0.2, 0.33],
  overcast: [0.22, 0.22, 0.28],
  night: [0.15, 0.16, 0.24],
};
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = Math.min(1, Math.max(0, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");

type Draw = {
  key: string; w: number; h: number; k: number;
  draw: (p: Pen) => void;
  x: number; y: number; z: number;
  scale: number; mirror: boolean;
};

type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number };

/** natural 4-frame blink: half / shut / shut / half every ~2.0-3.5 s */
const blinkAt = (t: number, seed: number, fps: number) => {
  const period = 2.0 + (seed % 5) * 0.31;
  const k = Math.round(t * fps) % Math.max(5, Math.round(period * fps));
  return k < 4 ? [0.5, 1, 1, 0.5][k] : 0;
};

export class CastStage {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private draws: Draw[] = [];
  private blobs: FxPlace[] = [];

  private actor(i: number) {
    while (this.actors.length <= i) this.actors.push(new Actor(this.root));
    return this.actors[i];
  }
  private fx(i: number) {
    while (this.fxs.length <= i) this.fxs.push(new Fx(this.root));
    return this.fxs[i];
  }

  update(
    calls: CastCall[],
    frame: number,
    fps: number,
    cam: THREE.PerspectiveCamera,
    sun: THREE.Vector3,
    light: LightName,
    shotFrames?: [number, number],
  ) {
    const t = frame / fps, L = LIGHTS[light];
    this.camX = cam.position.x; this.camZ = cam.position.z;
    this.actorShadows = L.actorShadow;
    this.draws.length = 0; this.blobs.length = 0;
    cam.updateMatrixWorld();

    const shotProg = shotFrames && shotFrames[1] > shotFrames[0] ? (frame - shotFrames[0]) / (shotFrames[1] - shotFrames[0]) : 0;
    const clampedProg = Math.max(0, Math.min(1, shotProg));

    for (const call of calls) {
      const member = CAST[call.actor];
      if (!member) continue;
      const act = (ACTIONS[call.action ?? "idle"] ?? ACTIONS.idle)(t + (call.actionOffset ?? 0));
      const scale = (call.scale ?? 1) * (member.height ?? 1);

      // 1. Position interpolation if 'to' is defined
      let [x, y, z] = call.at;
      if (call.to) {
        const easeFn = EASES[call.ease ?? "linear"] ?? EASES.linear;
        const u = easeFn(clampedProg);
        x = call.at[0] + (call.to[0] - call.at[0]) * u;
        y = call.at[1] + (call.to[1] - call.at[1]) * u;
        z = call.at[2] + (call.to[2] - call.at[2]) * u;
      }

      // 2. Shiver / fear trembling
      const shiver = call.shiver ?? (call.action === "tremble_fear" ? 1 : 0);
      if (shiver > 0) {
        const jx = (Math.sin(t * 38) + Math.cos(t * 53)) * 0.025 * shiver;
        const jz = Math.cos(t * 43) * 0.02 * shiver;
        x += jx;
        z += jz;
      }

      const towardCam = Math.hypot(cam.position.x - x, cam.position.z - z) > 1e-3;
      let dirX = 0, dirZ = 1;
      if (call.facing != null) {
        dirX = Math.sin(THREE.MathUtils.degToRad(call.facing));
        dirZ = Math.cos(THREE.MathUtils.degToRad(call.facing));
      } else if (call.to) {
        dirX = call.to[0] - call.at[0];
        dirZ = call.to[2] - call.at[2];
      } else if (towardCam) {
        dirX = cam.position.x - x;
        dirZ = cam.position.z - z;
      }

      const view = viewOf(cam, x, z, dirX, dirZ);
      const side = view.side && act.mode !== "sit" && act.mode !== "fall";

      // 3. Dynamic expression timeline
      let expr: Expr = (call.expr as Expr | undefined) ?? act.expr;
      let isSwap = false;
      if (call.exprTimeline && call.exprTimeline.length > 0) {
        for (const item of call.exprTimeline) {
          if (Array.isArray(item)) {
            const [p, ex] = item;
            if (clampedProg >= p) {
              expr = ex as Expr;
            }
          } else if (item && typeof item === "object") {
            const obj = item as { frame: number; expr: string };
            if (frame >= obj.frame) {
              expr = obj.expr as Expr;
            }
          }
        }
      }

      const blink = blinkAt(t, member.seed, fps);
      const mirror = side && view.mirror;
      const lgt = light2D(cam, mirror, sun);
      const d = cam.position.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
      const [w, h, k] = tier(d);

      // Subtle alive breathing bob for stationary poses
      const idleBreathing = act.mode === "stand" || act.mode === "sit" ? Math.sin(t * 2.8 + member.seed * 3) * 3 : 0;
      const shiverTilt = shiver > 0 ? Math.sin(t * 45) * 5 * shiver : 0;
      const lookVal = call.look ?? act.look ?? 0;

      const fo: FrontOpts = {
        phase: q(act.phase, 12),
        expr,
        mode: act.mode,
        look: lookVal,
        blink,
        lift: q((act.lift ?? 60) + idleBreathing, 4),
        tilt: q((act.tilt ?? 0) + shiverTilt, 2),
        headTilt: act.headTilt,
        light: lgt,
        seed: member.seed,
        wave: act.wave,
        armsUp: act.armsUp,
        armsOut: act.armsOut,
        prop: act.prop ?? null,
      };

      const so: SideOpts = {
        phase: q(act.phase, 12),
        expr,
        mode: act.mode === "march" || act.mode === "stroll" ? "march" : "stand",
        blink,
        stride: q(act.stride ?? 1, 4),
        light: lgt,
        seed: member.seed,
      };

      const key = side ? `S|${call.actor}|${fkey(so)}` : `F|${call.actor}|${fkey(fo)}`;
      this.draws.push({ key, w, h, k, draw: (p) => (side ? bodySide(p, member.outfit, so) : bodyFront(p, member.outfit, fo)), x, y, z, scale, mirror });
      if (act.mode !== "fall") this.blob(x, y, z, scale, sun, light);
    }
    this.flush();
  }

  /** soft contact pool plus lighter tail stretched away from the sun/moon */
  private blob(x: number, y: number, z: number, sc: number, sun: THREE.Vector3, light: LightName) {
    const hl = Math.hypot(sun.x, sun.z) || 1, ox = -sun.x / hl, oz = -sun.z / hl, rot = Math.atan2(-ox, -oz);
    if (light === "day" || light === "night") {
      const el = Math.asin(Math.min(0.99, Math.max(0.1, sun.y)));
      const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
      const tc = hexOf(light === "night" ? [0.12, 0.13, 0.2] : TAIL, 1);
      this.blobs.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
    }
    const cc = hexOf(CONTACT[light], 1);
    this.blobs.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
  }

  private flush() {
    let ai = 0, fi = 0;
    for (const p of this.draws) {
      const a = this.actor(ai++);
      a.r = this.pool.req(p.key, p.w, p.h, p.k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(this.camX - p.x, this.camZ - p.z), 0);
      a.mesh.scale.set(p.mirror ? -p.scale : p.scale, p.scale, p.scale);
      a.mesh.castShadow = this.actorShadows;
      a.bind();
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (const p of this.blobs) {
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(false);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      e.mesh.scale.set(p.w, p.h, 1);
      e.bind();
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
  }

  // camera position for billboard yaw; set by update()
  private camX = 0;
  private camZ = 0;
  private actorShadows = false;
}
