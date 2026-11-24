// Shawshank-inspired code stage. Seven sets share one painted language:
// cold ashlar cells, a vast gray yard, a rain-lashed outer wall and a golden
// meadow. Everything is procedural geometry + canvas textures; no external art.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { twoTone } from "../../engine/look/shade";
import { NOINK } from "../../engine/look/ink";
import { Batch, V, boxGeo, floor } from "../../engine/kit/batch";
import { rng } from "../../engine/textures/paint";
import type { CodeScene, Episode } from "../../engine/shot/types";
import {
  blanket,
  cellFloor,
  cellMouth,
  cellStone,
  chipHole,
  glow,
  meadowGold,
  oldWood,
  posterArt,
  posterTorn,
  prisonBrick,
  prisonSign,
  rustMetal,
  stormWater,
  ticking,
  tiled,
  tunnelInner,
  wetWall,
  windowRain,
  yardDirt,
} from "./textures";

type Built = {
  root: THREE.Group;
  update: (frame: number, fps: number) => void;
  dispose: () => void;
};

type CellMode = "hook" | "poster" | "chip" | "breach";

const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));
const basic = (p: THREE.MeshBasicMaterialParameters) => new THREE.MeshBasicMaterial(p);
const M = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );

const mesh = (
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  cast = true,
  receive = true,
) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
};

const card = (
  parent: THREE.Object3D,
  material: THREE.Material,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rz = 0,
) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.set(0, ry, rz);
  m.receiveShadow = true;
  parent.add(m);
  return m;
};

const glowCard = (
  parent: THREE.Object3D,
  color: string,
  opacity: number,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rz = 0,
) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    basic({
      map: glow(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  m.position.set(x, y, z);
  m.rotation.set(0, ry, rz);
  m.layers.set(NOINK);
  parent.add(m);
  return m;
};

// ---------------------------------------------------------------------------
// particles / weather (all deterministic by absolute frame)
// ---------------------------------------------------------------------------
const points = (positions: Float32Array, color: string, size: number, additive = true) => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: additive ? glow() : null,
    transparent: true,
    opacity: additive ? 0.55 : 0.9,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    sizeAttenuation: true,
    fog: true,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  p.layers.set(NOINK);
  return p;
};

type Rain = { mesh: THREE.LineSegments; update: (frame: number) => void; baseOpacity: number; material: THREE.LineBasicMaterial };

const makeRain = (
  count: number,
  area: { x: number; y: number; z: number },
  opts: { fall?: number; wind?: number; color?: string; opacity?: number; z0?: number; z1?: number } = {},
): Rain => {
  const fall = opts.fall ?? 1.15;
  const wind = opts.wind ?? 0.18;
  const color = opts.color ?? "#b9cdf0";
  const opacity = opts.opacity ?? 0.5;
  const rand = rng(9137 + count);
  const base = new Float32Array(count * 4);
  const pos = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    base[i * 4] = (rand() - 0.5) * area.x;
    base[i * 4 + 1] = rand() * area.y;
    base[i * 4 + 2] = (opts.z0 ?? -area.z / 2) + rand() * ((opts.z1 ?? area.z / 2) - (opts.z0 ?? -area.z / 2));
    base[i * 4 + 3] = 0.35 + rand() * 0.7;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    fog: true,
  });
  const line = new THREE.LineSegments(geo, material);
  line.frustumCulled = false;
  line.layers.set(NOINK);
  const update = (frame: number) => {
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const x0 = base[i * 4], y0 = base[i * 4 + 1], z0 = base[i * 4 + 2], len = base[i * 4 + 3];
      let y = y0 - ((frame * fall) % area.y);
      if (y < 0) y += area.y;
      const x = x0 + (area.y - y) * wind * 0.28;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y + 0.2;
      arr[i * 6 + 2] = z0;
      arr[i * 6 + 3] = x - wind * len * 0.3;
      arr[i * 6 + 4] = y - len;
      arr[i * 6 + 5] = z0;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return { mesh: line, update, baseOpacity: opacity, material };
};

const flashPulse = (frame: number, schedule: number[]) => {
  let p = 0;
  for (const f of schedule) {
    const d = frame - f;
    if (d >= 0 && d < 10) {
      const v = [1, 0.92, 0.68, 0.44, 0.26, 0.14, 0.07, 0.03, 0.01, 0][d];
      if (v > p) p = v;
    }
  }
  return p;
};

const makeBolt = (x: number, z: number, top: number, bottom: number, seed: number) => {
  const rand = rng(seed);
  const pts: number[] = [];
  let px = x;
  let py = top;
  const steps = 13;
  for (let i = 0; i < steps; i++) {
    const nx = px + (rand() - 0.5) * 2.4;
    const ny = py - (top - bottom) / steps;
    pts.push(px, py, z, nx, ny, z);
    // occasional fork
    if (i === 5 || i === 8) {
      pts.push(nx, ny, z, nx + (rand() - 0.5) * 4, ny - 1.2, z);
    }
    px = nx;
    py = ny;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: "#eaf4ff", transparent: true, opacity: 0, depthWrite: false, fog: false });
  const line = new THREE.LineSegments(geo, mat);
  line.layers.set(NOINK);
  line.frustumCulled = false;
  return { line, material: mat };
};

// ---------------------------------------------------------------------------
// cell
// ---------------------------------------------------------------------------
const buildCell = (mode: CellMode): Built => {
  const root = new THREE.Group();
  const b = new Batch();
  const stone = lam({ map: cellStone() });
  const stoneDark = lam({ map: cellStone(), color: "#a6a7ab" });
  const stoneFloor = lam({ map: cellFloor() });
  const metal = lam({ map: rustMetal() });
  const wood = lam({ map: oldWood() });
  const wool = lam({ map: blanket() });
  const tick = lam({ map: ticking() });
  const black = basic({ color: "#111317" });

  const W = 1.4, back = -1.8, H = 3.6;
  const ox0 = -0.4, ox1 = 0.78, oy0 = 0.3, oy1 = 1.98;

  // floor + side walls (cutaway front: the camera lives in the corridor)
  b.add(floor(-W, W, back - 0.1, 1.35, 0, 5, 7), stoneFloor);
  b.add(boxGeo(V(-W - 0.22, 0, back - 0.2), V(-W, H, 1.35), 2.2), stone);
  b.add(boxGeo(V(W, 0, back - 0.2), V(W + 0.22, H, 1.35), 2.2), stone);
  // back wall around the recessed panel / eventual tunnel mouth
  b.add(boxGeo(V(-W, 0, back - 0.26), V(ox0, H, back), 2.4), stone);
  b.add(boxGeo(V(ox1, 0, back - 0.26), V(W, H, back), 2.4), stone);
  b.add(boxGeo(V(ox0, 0, back - 0.26), V(ox1, oy0, back), 2.4), stone);
  b.add(boxGeo(V(ox0, oy1, back - 0.26), V(ox1, H, back), 2.4), stone);
  // ceiling edge / cornice, kept out of the camera's framed area
  b.add(boxGeo(V(-W, 3.28, back - 0.1), V(W, 3.42, back + 0.12), 2.4), stoneDark);

  // ---- window (left of the panel) ----
  const wx = -0.92, wy = 2.2, ww = 0.58, wh = 0.74;
  b.add(boxGeo(V(wx - ww / 2 - 0.07, wy - wh / 2 - 0.07, back - 0.02), V(wx + ww / 2 + 0.07, wy + wh / 2 + 0.07, back + 0.05), 0), stoneDark);
  const skyCard = card(root, basic({ color: "#26415f", fog: false }), ww, wh, wx, wy, back - 0.01);
  skyCard.layers.set(NOINK);
  const rainCard = card(root, basic({ map: windowRain(), transparent: true, opacity: 0.95, depthWrite: false, fog: false }), ww, wh, wx, wy, back + 0.002);
  rainCard.layers.set(NOINK);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), basic({ color: "#dce9ff", fog: false }));
  moon.position.set(wx + 0.13, wy + 0.2, back + 0.004);
  moon.layers.set(NOINK);
  root.add(moon);
  const winGlow = glowCard(root, "#9fc6ff", 0.5, 1.15, 1.25, wx, wy, back + 0.04);
  // bars + frame
  b.add(boxGeo(V(wx - ww / 2 - 0.04, wy - wh / 2 - 0.04, back + 0.03), V(wx + ww / 2 + 0.04, wy - wh / 2 + 0.02, back + 0.08), 0), metal);
  b.add(boxGeo(V(wx - ww / 2 - 0.04, wy + wh / 2 - 0.02, back + 0.03), V(wx + ww / 2 + 0.04, wy + wh / 2 + 0.04, back + 0.08), 0), metal);
  b.add(boxGeo(V(wx - ww / 2 - 0.04, wy - wh / 2, back + 0.03), V(wx - ww / 2 + 0.02, wy + wh / 2, back + 0.08), 0), metal);
  b.add(boxGeo(V(wx + ww / 2 - 0.02, wy - wh / 2, back + 0.03), V(wx + ww / 2 + 0.04, wy + wh / 2, back + 0.08), 0), metal);
  for (let i = 0; i < 4; i++) {
    const bx = wx - ww / 2 + 0.12 + i * 0.115;
    b.add(new THREE.CylinderGeometry(0.016, 0.016, wh, 6), metal, M(bx, wy, back + 0.06));
  }
  b.add(new THREE.CylinderGeometry(0.012, 0.012, ww, 6), metal, M(wx, wy, back + 0.06, 0, 0, Math.PI / 2));

  // soft moon shafts / pool, for atmosphere rather than a literal spotlight
  const shaftA = glowCard(root, "#b9d5ff", 0.10, 1.1, 3.0, wx + 0.05, 1.35, back + 0.15, 0, 0.12);
  shaftA.rotation.x = -0.28;
  const pool = glowCard(root, "#a9c9f3", 0.11, 1.9, 1.0, wx + 0.5, 0.02, back + 1.0);
  pool.rotation.x = -Math.PI / 2;

  // ---- recessed panel (solid wall plug) or the escape tunnel ----
  if (mode !== "breach") {
    b.add(boxGeo(V(ox0, oy0, back - 0.16), V(ox1, oy1, back - 0.04), 2.4), stoneDark);
  } else {
    // A painted tunnel interior sits behind a jagged stone mask, so the
    // break reads as torn rock rather than a rectangular hole.
    const tunnel = card(root, basic({ map: tunnelInner(), fog: false }), 1.46, 2.0, 0.19, 1.14, back - 0.34);
    tunnel.name = "farGlow";
    tunnel.layers.set(NOINK);
    const mask = card(
      root,
      lam({ map: cellMouth(), alphaTest: 0.5, side: THREE.DoubleSide }),
      1.66,
      2.18,
      0.19,
      1.14,
      back + 0.01,
    );
    mask.receiveShadow = true;
    const rimRand = rng(4711);
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2 + (rimRand() - 0.5) * 0.16;
      const rr = 0.92 + (rimRand() - 0.5) * 0.24;
      const x = 0.19 + Math.cos(a) * 0.62 * rr;
      const y = 1.16 + Math.sin(a) * 0.96 * rr;
      const r = 0.045 + rimRand() * 0.095;
      b.add(
        new THREE.DodecahedronGeometry(r, 0),
        rimRand() > 0.45 ? stone : stoneDark,
        M(x, y, back + 0.04 + (rimRand() - 0.5) * 0.14, rimRand() * 3, rimRand() * 3, rimRand() * 3),
      );
    }
    // a couple of larger broken blocks at the lip
    for (const [x, y, r] of [[-0.3, 0.42, 0.14], [0.72, 1.86, 0.15], [-0.24, 1.72, 0.12], [0.7, 0.5, 0.11]] as const) {
      b.add(new THREE.DodecahedronGeometry(r, 0), stone, M(x, y, back + 0.02, rimRand() * 3, rimRand() * 3, rimRand() * 3));
    }
    // rubble on the cell floor
    for (let i = 0; i < 18; i++) {
      const x = ox0 + 0.08 + rimRand() * (ox1 - ox0 - 0.16);
      const z = back + 0.14 + rimRand() * 1.15;
      const r = 0.03 + rimRand() * 0.07;
      b.add(new THREE.DodecahedronGeometry(r, 0), i % 3 ? stone : stoneDark, M(x, r * 0.55, z, rimRand() * 2, rimRand() * 3, rimRand() * 2));
    }
  }

  // ---- poster (pasted on the panel, or torn aside after the escape) ----
  let poster: THREE.Mesh | null = null;
  if (mode === "breach") {
    const torn = card(root, basic({ map: posterTorn(), color: "#8a8072", alphaTest: 0.42, side: THREE.DoubleSide }), 0.8, 1.12, 1.22, 1.28, back - 0.03, 0.12, -0.18);
    torn.layers.set(NOINK);
    poster = torn;
    // a couple of scraps on the floor
    for (let i = 0; i < 4; i++) {
      b.add(new THREE.PlaneGeometry(0.08 + i * 0.02, 0.12), black, M(0.2 + i * 0.16, 0.012, 0.3 + (i % 2) * 0.3, -Math.PI / 2, i * 1.2, 0));
    }
  } else {
    const p = card(
      root,
      basic({ map: posterArt() }),
      0.8,
      1.12,
      mode === "chip" ? 0.3 : 0.2,
      1.32,
      back - 0.012,
      0,
      mode === "chip" ? 0.055 : 0.01,
    );
    p.layers.set(NOINK);
    poster = p;
  }

  // the chipping hole peeking from behind the poster
  if (mode === "chip") {
    const hole = card(root, basic({ map: chipHole(), transparent: true, alphaTest: 0.02 }), 0.66, 0.82, -0.16, 1.06, back - 0.02);
    hole.layers.set(NOINK);
    for (let i = 0; i < 8; i++) {
      const rr = rng(801 + i);
      b.add(
        new THREE.DodecahedronGeometry(0.03 + rr() * 0.04, 0),
        i % 3 ? stone : stoneDark,
        M(-0.42 + rr() * 0.76, 0.035 + rr() * 0.02, back + 0.12 + rr() * 0.55, rr() * 3, rr() * 3, rr() * 3),
      );
    }
  }

  // ---- bunk on the left ----
  const bunkX = -1.0, bunkZ = -0.55;
  for (const [dx, dz] of [[-0.4, -0.78], [0.4, -0.78], [-0.4, 0.72], [0.4, 0.72]])
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 6), metal, M(bunkX + dx, 0.39, bunkZ + dz));
  b.add(boxGeo(V(bunkX - 0.42, 0.55, bunkZ - 0.82), V(bunkX + 0.42, 0.62, bunkZ + 0.82), 1.4), metal);
  b.add(boxGeo(V(bunkX - 0.38, 0.62, bunkZ - 0.74), V(bunkX + 0.38, 0.72, bunkZ + 0.74), 1.2), tick);
  b.add(boxGeo(V(bunkX - 0.38, 0.72, bunkZ - 0.72), V(bunkX + 0.36, 0.79, bunkZ + 0.5), 1.2), wool);
  b.add(boxGeo(V(bunkX - 0.24, 0.78, bunkZ - 0.76), V(bunkX + 0.24, 0.92, bunkZ - 0.48), 1), tick);
  // a folded towel and a photo on the bunk
  b.add(boxGeo(V(bunkX + 0.02, 0.79, bunkZ + 0.56), V(bunkX + 0.28, 0.85, bunkZ + 0.75), 0), wool);
  b.add(boxGeo(V(bunkX - 0.34, 0.79, bunkZ + 0.58), V(bunkX - 0.05, 0.8, bunkZ + 0.78), 0), basic({ color: "#7a5a42" }));

  // ---- table + lamp + book + cup on the right ----
  const tx = 0.96, tz = -0.48, ty = 0.72;
  b.add(boxGeo(V(tx - 0.3, ty - 0.05, tz - 0.24), V(tx + 0.3, ty, tz + 0.24), 1.2), wood);
  for (const [dx, dz] of [[-0.24, -0.18], [0.24, -0.18], [-0.24, 0.18], [0.24, 0.18]])
    b.add(new THREE.CylinderGeometry(0.024, 0.03, ty - 0.03, 6), wood, M(tx + dx, (ty - 0.03) / 2, tz + dz));
  b.add(boxGeo(V(tx - 0.19, ty, tz - 0.11), V(tx + 0.02, ty + 0.07, tz + 0.11), 0), basic({ color: "#2b2928" }));
  b.add(boxGeo(V(tx - 0.15, ty + 0.07, tz - 0.09), V(tx - 0.02, ty + 0.075, tz + 0.09), 0), basic({ color: "#d8c9a8" }));
  b.add(new THREE.CylinderGeometry(0.055, 0.042, 0.08, 8), metal, M(tx + 0.18, ty + 0.04, tz + 0.02));
  b.add(new THREE.CylinderGeometry(0.046, 0.04, 0.13, 8), metal, M(tx + 0.18, ty + 0.13, tz + 0.02));
  const glass = mesh(root, new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), basic({ color: "#ffcf8a", fog: false }), tx + 0.18, ty + 0.2, tz + 0.02);
  const flame = mesh(root, new THREE.ConeGeometry(0.022, 0.09, 8), basic({ color: "#fff2b8", fog: false }), tx + 0.18, ty + 0.3, tz + 0.02);
  flame.layers.set(NOINK);
  const lampGlow = glowCard(root, "#ffb45e", 0.52, 0.85, 0.85, tx + 0.18, ty + 0.23, tz + 0.08);
  const wallWarm = glowCard(root, "#ffb15c", 0.12, 1.6, 2.05, 0.9, 1.25, back + 0.02);

  // ---- wall details: 5 groups of scratches, a hanging bulb, a drain ----
  const scratchMat = basic({ color: "#2a2521" });
  for (let g = 0; g < 5; g++) {
    for (let i = 0; i < 4; i++) {
      const xx = -0.33 + g * 0.09;
      const yy = 1.72 + (i % 2) * 0.09;
      b.add(boxGeo(V(xx, yy, back + 0.005), V(xx + 0.008, yy + 0.065 + (i === 0 ? 0.02 : 0), back + 0.012), 0), scratchMat);
    }
  }
  b.add(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), black, M(0.92, 3.08, -0.6));
  const bulb = mesh(root, new THREE.SphereGeometry(0.045, 8, 8), basic({ color: "#ffd9a0", fog: false }), 0.92, 2.76, -0.6);
  bulb.layers.set(NOINK);
  const bulbGlow = glowCard(root, "#ffb767", 0.16, 0.55, 0.55, 0.92, 2.76, -0.58);

  // floor drain
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 16), basic({ color: "#2d2b28" }), M(0.68, 0.006, 0.22));
  for (let i = 0; i < 4; i++) b.add(boxGeo(V(0.55, 0.011, 0.13 + i * 0.055), V(0.81, 0.012, 0.145 + i * 0.055), 0), black);

  // ---- dust motes ----
  const dustRand = rng(3301);
  const dustN = 70;
  const dustPos = new Float32Array(dustN * 3);
  const dustBase: [number, number, number, number][] = [];
  for (let i = 0; i < dustN; i++) {
    const x = -1.1 + dustRand() * 2.2;
    const y = 0.3 + dustRand() * 2.6;
    const z = back + 0.3 + dustRand() * 2.2;
    dustBase.push([x, y, z, 0.3 + dustRand() * 1.2]);
    dustPos[i * 3] = x; dustPos[i * 3 + 1] = y; dustPos[i * 3 + 2] = z;
  }
  const dust = points(dustPos, "#b7cef0", 0.018);
  root.add(dust);

  // ---- chipping debris & dust puff ----
  let chipPts: THREE.Points | null = null;
  let chipBase: [number, number, number, number, number][] = [];
  let puff: THREE.Mesh | null = null;
  if (mode === "chip") {
    const cr = rng(6120);
    const N = 18;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      chipBase.push([cr() - 0.5, cr() * 0.8 + 0.2, cr() - 0.5, 0.15 + cr() * 0.35, cr()]);
      pos[i * 3] = 0; pos[i * 3 + 1] = -5; pos[i * 3 + 2] = 0;
    }
    chipPts = points(pos, "#d6cdbf", 0.028, false);
    (chipPts.material as THREE.PointsMaterial).opacity = 1;
    root.add(chipPts);
    puff = glowCard(root, "#cfc6b6", 0.0, 0.32, 0.32, 0.26, 1.1, back + 0.05);
  }

  // breach lightning
  let flashCard: THREE.Mesh | null = null;
  let tunnelGlow: THREE.Mesh | null = null;
  if (mode === "breach") {
    flashCard = glowCard(root, "#dbeaff", 0.0, 2.0, 2.2, wx, wy, back + 0.02);
    tunnelGlow = glowCard(root, "#9cc2f2", 0.3, 0.9, 1.25, 0.19, 1.16, back - 0.32);
  }

  b.build(root);

  // must exist for both poster shapes
  const litPoster = poster as THREE.Mesh | null;

  const update = (frame: number, fps: number) => {
    const t = frame / fps;
    // lamp + bulb breathing
    const flick = 0.86 + 0.08 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 23.7);
    (lampGlow.material as THREE.MeshBasicMaterial).opacity = 0.5 * flick;
    (wallWarm.material as THREE.MeshBasicMaterial).opacity = 0.11 * flick;
    (bulbGlow.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.035 * Math.sin(t * 9.1);
    (glass.material as THREE.MeshBasicMaterial).color.setHSL(0.08, 0.7, 0.62 + 0.04 * Math.sin(t * 9.3));
    (rainCard.material as THREE.MeshBasicMaterial).map!.offset.y = (t * 0.33) % 1;
    (winGlow.material as THREE.MeshBasicMaterial).opacity = 0.42 + 0.06 * Math.sin(t * 2.3);

    // poster creaks very slightly
    if (litPoster) litPoster.rotation.z = (mode === "breach" ? -0.3 : mode === "chip" ? 0.055 : 0.01) + 0.008 * Math.sin(t * 1.6);

    // dust drift
    const arr = dust.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < dustN; i++) {
      const [x, y0, z, sp] = dustBase[i];
      arr[i * 3] = x + Math.sin(t * 0.24 + i) * 0.08;
      arr[i * 3 + 1] = y0 + ((t * 0.035 * sp) % 0.5);
      arr[i * 3 + 2] = z + Math.cos(t * 0.19 + i * 1.7) * 0.06;
    }
    dust.geometry.attributes.position.needsUpdate = true;

    // chipping: one strike every ~1.01 s, chips fly out and fall
    if (chipPts && puff) {
      const period = (Math.PI * 2) / 6.2;
      const arr2 = chipPts.geometry.attributes.position.array as Float32Array;
      const local = (t % period) / period;
      const age = local * period;
      for (let i = 0; i < chipBase.length; i++) {
        const [vx, vy, vz, life, ph] = chipBase[i];
        const aa = (age + ph * period * 0.2) % (period * 0.7);
        const visible = aa < life;
        const g = 2.6;
        const x = 0.27 + vx * aa * 1.7;
        const y = 1.14 + vy * aa * 1.7 - 0.5 * g * aa * aa;
        const z = back + 0.06 + vz * aa * 0.6;
        arr2[i * 3] = visible ? x : 0;
        arr2[i * 3 + 1] = visible ? Math.max(0.01, y) : -5;
        arr2[i * 3 + 2] = visible ? z : 0;
      }
      chipPts.geometry.attributes.position.needsUpdate = true;
      const pulse = Math.max(0, Math.sin(t * 6.2));
      (puff.material as THREE.MeshBasicMaterial).opacity = 0.08 + 0.12 * pulse;
      puff.scale.setScalar(0.8 + 0.8 * pulse);
    }

    // storm flashes inside the cell
    if (mode === "breach") {
      const p = flashPulse(frame, [982, 1041, 1096]);
      if (flashCard) (flashCard.material as THREE.MeshBasicMaterial).opacity = 0.85 * p;
      if (tunnelGlow) (tunnelGlow.material as THREE.MeshBasicMaterial).opacity = 0.24 + 0.5 * p;
      (rainCard.material as THREE.MeshBasicMaterial).opacity = 0.85 + 0.15 * p;
      (winGlow.material as THREE.MeshBasicMaterial).opacity = 0.42 + 0.5 * p;
    }
  };

  return {
    root,
    update,
    dispose: () => {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        mats.forEach((mm) => mm.dispose());
      });
    },
  };
};

// ---------------------------------------------------------------------------
// prison yard
// ---------------------------------------------------------------------------
type Walker = { group: THREE.Group; baseX: number; phase: number; speed: number; dir: number };

const buildYard = (): Built => {
  const root = new THREE.Group();
  const b = new Batch();
  const brick = lam({ map: prisonBrick() });
  const brickDark = lam({ map: prisonBrick(), color: "#8c8c90" });
  const dirt = lam({ map: yardDirt() });
  const metal = lam({ map: rustMetal() });
  const wood = lam({ map: oldWood() });
  const cloth = lam({ map: blanket(), side: THREE.DoubleSide });
  const signMat = basic({ map: prisonSign() });
  const puddleMat = basic({ map: stormWater(), color: "#657a92", transparent: true, opacity: 0.58, depthWrite: false });
  const rand = rng(881);

  // ground
  b.add(floor(-34, 34, -22, 14, 0, 18, 12), dirt);

  // perimeter wall + gate + buttresses
  b.add(boxGeo(V(-32, 0, -16), V(32, 9.4, -15.1), 3.2), brick);
  b.add(boxGeo(V(-32, 9.4, -16.1), V(32, 9.75, -14.95), 2.4), brickDark);
  for (const x of [-11, -7, -3, 3, 7, 11]) {
    b.add(boxGeo(V(x - 0.5, 0, -15.45), V(x + 0.5, 9.6, -14.7), 2.4), brickDark);
    b.add(boxGeo(V(x - 0.62, 9.6, -15.55), V(x + 0.62, 9.9, -14.6), 2.2), brick);
  }
  // gate
  b.add(boxGeo(V(-1.9, 0, -15.0), V(1.9, 4.5, -14.82), 1.4), metal);
  for (let i = 0; i < 5; i++) b.add(boxGeo(V(-1.7 + i * 0.85, 0, -14.8), V(-1.55 + i * 0.85, 4.35, -14.76), 0), brickDark);
  for (let i = 0; i < 4; i++) b.add(boxGeo(V(-1.9, 0.8 + i * 1.0, -14.8), V(1.9, 0.9 + i * 1.0, -14.76), 0), brickDark);
  // sign
  const sign = card(root, signMat, 4.2, 2.1, 0, 6.4, -15.02);
  sign.layers.set(NOINK);
  b.add(boxGeo(V(-2.25, 5.28, -15.06), V(2.25, 5.4, -14.96), 0), wood);
  b.add(boxGeo(V(-2.25, 7.42, -15.06), V(2.25, 7.54, -14.96), 0), wood);

  // catwalk + railing along the top
  b.add(boxGeo(V(-32, 7.7, -15.1), V(32, 7.82, -14.15), 2.0), metal);
  for (let x = -31; x <= 31; x += 2.6) {
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 5), metal, M(x, 8.35, -14.28));
  }
  b.add(boxGeo(V(-32, 8.88, -14.34), V(32, 8.94, -14.26), 0), metal);
  b.add(boxGeo(V(-32, 8.2, -14.34), V(32, 8.26, -14.26), 0), metal);

  // barbed wire: a few dark strands with short diagonal barbs
  const wirePts: number[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = -32 + i * 0.8;
    const y = 9.9 + Math.sin(i * 0.8) * 0.04;
    wirePts.push(x, y, -15.3, x + 0.8, y, -15.3);
    wirePts.push(x, y - 0.22, -15.3, x + 0.65, y + 0.22, -15.3);
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wirePts, 3));
  const wire = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: "#23282f", transparent: true, opacity: 0.9 }));
  wire.layers.set(NOINK);
  root.add(wire);

  // watchtower (left of centre, so it reads inside the vertical frame)
  const tw = new THREE.Group();
  const towerMat = lam({ map: oldWood() });
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
    tw.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 9.8, 6), towerMat)).children;
    const leg = tw.children[tw.children.length - 1] as THREE.Mesh;
    leg.position.set(dx, 4.9, dz);
    leg.castShadow = true;
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2.2), towerMat);
  cabin.position.set(0, 10.4, 0); cabin.castShadow = true; tw.add(cabin);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.9, 4), brickDark);
  roof.position.set(0, 11.6, 0); roof.rotation.y = Math.PI / 4; tw.add(roof);
  const lampBox = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 10), metal);
  lampBox.rotation.z = Math.PI / 2; lampBox.position.set(0.9, 10.4, 1.2); tw.add(lampBox);
  tw.position.set(-4.6, 0, -14.4);
  root.add(tw);
  glowCard(root, "#f5e6b5", 0.5, 1.2, 1.2, -3.7, 10.4, -13.2);

  // searchlight cone
  const beamGroup = new THREE.Group();
  beamGroup.position.set(-3.7, 10.4, -13.2);
  const beamMat = basic({
    color: "#d9e6ff",
    transparent: true,
    opacity: 0.055,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 25, 20, 1, true), beamMat);
  beam.position.y = -12.5;
  beam.layers.set(NOINK);
  beamGroup.add(beam);
  beamGroup.rotation.x = -Math.PI / 2 + 0.22;
  beamGroup.rotation.z = 0.1;
  root.add(beamGroup);

  // laundry line + moving sheets
  const sheets: { m: THREE.Mesh; ph: number }[] = [];
  for (const x of [-3.5, 2.6]) b.add(new THREE.CylinderGeometry(0.045, 0.055, 2.4, 6), wood, M(x, 1.2, -3.3));
  const ropeGeo = new THREE.BufferGeometry();
  const ropePts: number[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    ropePts.push(-3.5 + u * 6.1, 2.25 - Math.sin(u * Math.PI) * 0.25, -3.3);
  }
  ropeGeo.setAttribute("position", new THREE.Float32BufferAttribute(ropePts, 3));
  const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: "#3b342c" }));
  rope.layers.set(NOINK);
  root.add(rope);
  for (const [x, ph] of [[-2.8, 0.2], [-1.3, 1.4], [0.4, 2.2], [1.9, 0.7]] as const) {
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.15), cloth);
    sm.position.set(x, 1.55, -3.3);
    sm.castShadow = true;
    sm.receiveShadow = true;
    root.add(sm);
    sheets.push({ m: sm, ph });
  }

  // simple rows of inmates far back; their slow drift keeps the yard alive
  const walkers: Walker[] = [];
  const bodyMat = lam({ color: "#596473" });
  const headMat = lam({ color: "#c79a76" });
  const capMat = lam({ color: "#384252" });
  const buildWalker = (x: number, z: number, s: number, phase: number, dir: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.72, 7), bodyMat);
    body.position.y = 0.82; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), headMat);
    head.position.y = 1.33; head.castShadow = true; g.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.138, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.y = 1.39; g.add(cap);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.56, 5), bodyMat);
      leg.position.set(side * 0.07, 0.3, 0); leg.castShadow = true; g.add(leg);
    }
    g.scale.setScalar(s);
    g.position.set(x, 0, z);
    g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(g);
    walkers.push({ group: g, baseX: x, phase, speed: 0.09 + 0.04 * ((phase * 7) % 1), dir });
  };
  for (let i = 0; i < 10; i++) {
    const x = -6 + i * 1.35;
    const z = -6.5 + (i % 3) * 1.2;
    buildWalker(x, z, 0.9 + (i % 4) * 0.04, i * 0.9, i % 2 ? 1 : -1);
  }
  // a pair of guards on the catwalk
  for (const gx of [-2.2, 2.6]) {
    const gg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.8, 7), lam({ color: "#2f3d55" }));
    body.position.y = 0.88; gg.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), headMat);
    head.position.y = 1.42; gg.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.08, 8), lam({ color: "#202a3c" }));
    cap.position.y = 1.52; gg.add(cap);
    gg.position.set(gx, 7.82, -14.6);
    gg.rotation.y = -0.2;
    root.add(gg);
  }

  // foreground furniture: stone bench, crates, gravel, puddles
  const benchX = -2.1, benchZ = 2.3;
  b.add(boxGeo(V(benchX - 0.7, 0.42, benchZ - 0.22), V(benchX + 0.7, 0.5, benchZ + 0.22), 1.2), wood);
  for (const [dx, dz] of [[-0.52, -0.16], [0.52, -0.16], [-0.52, 0.16], [0.52, 0.16]])
    b.add(boxGeo(V(benchX + dx - 0.05, 0, benchZ + dz - 0.05), V(benchX + dx + 0.05, 0.42, benchZ + dz + 0.05), 0), stoneDarkForYard());
  b.add(boxGeo(V(2.0, 0, 1.4), V(2.55, 0.55, 1.95), 0.8), wood);
  b.add(boxGeo(V(2.06, 0.55, 1.46), V(2.48, 0.6, 1.9), 0), metal);
  // gravel pile
  for (let i = 0; i < 8; i++) {
    b.add(new THREE.DodecahedronGeometry(0.12 + rand() * 0.12, 0), brickDark, M(1.65 + rand() * 0.6, 0.08 + rand() * 0.12, 1.2 + rand() * 0.5, rand() * 3, rand() * 3, rand() * 3));
  }
  // puddles
  for (const [x, z, sx, sz] of [[-0.9, 1.9, 1.5, 0.6], [1.1, 0.7, 1.1, 0.5], [-2.6, -0.8, 1.9, 0.8]] as const) {
    const pm = new THREE.Mesh(new THREE.CircleGeometry(1, 22), puddleMat);
    pm.rotation.x = -Math.PI / 2;
    pm.position.set(x, 0.012, z);
    pm.scale.set(sx, sz, 1);
    pm.layers.set(NOINK);
    root.add(pm);
    glowCard(root, "#b9cbe0", 0.05, sx * 2.2, sz * 2.2, x, 0.02, z).rotation.x = -Math.PI / 2;
  }

  b.build(root);

  const update = (frame: number, fps: number) => {
    const t = frame / fps;
    beamGroup.rotation.y = Math.sin(t * 0.21) * 0.36;
    beamGroup.rotation.z = 0.06 + Math.sin(t * 0.14) * 0.05;
    for (const s of sheets) {
      s.m.rotation.x = 0.05 * Math.sin(t * 1.25 + s.ph);
      s.m.rotation.z = 0.035 * Math.sin(t * 0.95 + s.ph * 2);
    }
    for (const w of walkers) {
      w.group.position.x = w.baseX + Math.sin(t * w.speed + w.phase) * 1.7;
      w.group.position.y = Math.abs(Math.sin(t * 1.15 + w.phase)) * 0.035;
      w.group.rotation.y = Math.cos(t * w.speed + w.phase) * w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  };

  return { root, update, dispose: disposeTree(root) };
};

// a tiny helper so the bench legs reuse the painted stone without pulling in the cell palette
const stoneDarkForYard = () => lam({ map: prisonBrick(), color: "#9a9792" });

// ---------------------------------------------------------------------------
// freedom in the storm
// ---------------------------------------------------------------------------
const buildStorm = (): Built => {
  const root = new THREE.Group();
  const b = new Batch();
  const wall = lam({ map: wetWall() });
  const wallDark = lam({ map: wetWall(), color: "#8b9298" });
  const metal = lam({ map: rustMetal() });
  const waterTex = tiled(stormWater(), 7, 7);
  const waterMat = basic({ map: waterTex, color: "#5f7b96", transparent: false, fog: true });
  const rand = rng(1777);

  // the outer wall, seen from the ditch
  b.add(boxGeo(V(-26, -1, -11.2), V(26, 8, -10.2), 2.6), wall);
  b.add(boxGeo(V(-26, 8, -11.25), V(26, 8.35, -10.15), 2.2), wallDark);
  for (const x of [-11, -7, -3, 3, 7, 11]) b.add(boxGeo(V(x - 0.55, -1, -10.8), V(x + 0.55, 8.2, -9.95), 2.4), wallDark);
  // the pipe Andy crawled out of: a heavy iron culvert at the wall's foot
  const pipeY = 0.3;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.9, 18, 1, true), wallDark);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(-2.7, pipeY, -9.55);
  root.add(pipe);
  const pipeMouth = new THREE.Mesh(new THREE.CircleGeometry(0.82, 20), basic({ color: "#03050a", fog: false }));
  pipeMouth.position.set(-2.7, pipeY, -8.59);
  pipeMouth.layers.set(NOINK);
  root.add(pipeMouth);
  const pipeRim = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.99, 20), lam({ color: "#8b9099" }));
  pipeRim.position.set(-2.7, pipeY, -8.585);
  root.add(pipeRim);
  // a wet stain running from the culvert into the ditch
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.6),
    basic({ map: stormWater(), color: "#2b3d50", transparent: true, opacity: 0.55, depthWrite: false }),
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(-2.7, 0.23, -7.7);
  spill.layers.set(NOINK);
  root.add(spill);
  // rusted ladder up the wall
  for (const x of [2.2, 2.9]) b.add(new THREE.CylinderGeometry(0.035, 0.035, 7.2, 5), metal, M(x, 3.0, -10.05));
  for (let i = 0; i < 12; i++) b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 5), metal, M(2.55, 0.7 + i * 0.55, -10.05, 0, 0, Math.PI / 2));

  // water ditch
  const water = new THREE.Mesh(new THREE.PlaneGeometry(54, 30, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.22, -2.0);
  water.receiveShadow = true;
  root.add(water);
  // a soft reflected sky streak on the water
  const reflect = glowCard(root, "#9fc6ee", 0.07, 6, 12, 0, 0.235, -3.0);
  reflect.rotation.x = -Math.PI / 2;
  reflect.scale.set(1, 1.6, 1);

  // rain
  const rain = makeRain(1900, { x: 26, y: 19, z: 26 }, { fall: 1.5, wind: 0.55, opacity: 0.5, z0: -11, z1: 12 });
  root.add(rain.mesh);
  const nearRain = makeRain(500, { x: 8, y: 9, z: 10 }, { fall: 2.0, wind: 0.75, opacity: 0.32, z0: 1, z1: 8 });
  root.add(nearRain.mesh);

  // splash rings around Andy and across the ditch
  const rings: { m: THREE.Mesh; ph: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.RingGeometry(0.16, 0.22, 20);
    const mat = basic({
      color: "#cfe2f5",
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = -Math.PI / 2;
    const x = i < 6 ? (rand() - 0.5) * 2.2 : (rand() - 0.5) * 11;
    const z = i < 6 ? 0.2 + (rand() - 0.5) * 1.6 : -4 + rand() * 7;
    m.position.set(x, 0.225, z);
    m.layers.set(NOINK);
    root.add(m);
    rings.push({ m, ph: rand() });
  }

  // watchtower + searchlight, low at the frame edge
  const tw = new THREE.Group();
  const towerMat = lam({ color: "#2e3339" });
  for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9.4, 6), towerMat);
    leg.position.set(dx, 4.7, dz); tw.add(leg);
  }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 1.9), towerMat);
  cab.position.y = 9.9; tw.add(cab);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.8, 4), towerMat);
  roof.position.y = 11.0; roof.rotation.y = Math.PI / 4; tw.add(roof);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), basic({ color: "#e8f2ff", fog: false }));
  lamp.position.set(0.6, 9.9, 1.0); lamp.layers.set(NOINK); tw.add(lamp);
  tw.position.set(-6.4, 0, -9.6);
  root.add(tw);
  glowCard(root, "#bcd8ff", 0.65, 1.6, 1.6, -5.8, 9.9, -8.6);
  const beamGroup = new THREE.Group();
  beamGroup.position.set(-5.8, 9.9, -8.6);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 28, 18, 1, true),
    basic({ color: "#dce9ff", transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  beam.position.y = -14;
  beam.layers.set(NOINK);
  beamGroup.add(beam);
  beamGroup.rotation.x = -Math.PI / 2 + 0.24;
  beamGroup.rotation.z = -0.12;
  root.add(beamGroup);

  // lightning sky, bolts and wall wash
  const skyFlash = card(root, basic({ color: "#eaf4ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 120, 55, 0, 20, -40);
  skyFlash.layers.set(NOINK);
  const boltA = makeBolt(-7, -35, 24, 9, 7001);
  const boltB = makeBolt(6, -38, 27, 11, 7002);
  root.add(boltA.line, boltB.line);
  const wallWash = glowCard(root, "#cfe5ff", 0.0, 30, 13, 0, 4.5, -9.9);
  const waterFlash = glowCard(root, "#cfe5ff", 0.0, 20, 10, 0, 0.24, -2);
  waterFlash.rotation.x = -Math.PI / 2;

  b.build(root);

  const update = (frame: number, fps: number) => {
    const t = frame / fps;
    waterTex.offset.y = (t * 0.12) % 1;
    waterTex.offset.x = Math.sin(t * 0.1) * 0.03;
    rain.update(frame);
    nearRain.update(frame);
    beamGroup.rotation.y = 0.3 + Math.sin(t * 0.19) * 0.5;
    for (const r of rings) {
      const u = ((t * 0.72 + r.ph) % 1);
      r.m.scale.setScalar(0.5 + u * 1.6);
      (r.m.material as THREE.MeshBasicMaterial).opacity = 0.2 * (1 - u);
    }
    const p = flashPulse(frame, [1152, 1199, 1244]);
    (skyFlash.material as THREE.MeshBasicMaterial).opacity = 0.95 * p;
    (boltA.material as THREE.LineBasicMaterial).opacity = p;
    (boltB.material as THREE.LineBasicMaterial).opacity = p * 0.8;
    (wallWash.material as THREE.MeshBasicMaterial).opacity = 0.5 * p;
    (waterFlash.material as THREE.MeshBasicMaterial).opacity = 0.16 * p;
    rain.material.opacity = rain.baseOpacity + 0.25 * p;
    nearRain.material.opacity = nearRain.baseOpacity + 0.2 * p;
    reflect.material.opacity = 0.06 + 0.25 * p;
    (reflect.material as THREE.MeshBasicMaterial).color.setRGB(0.62 + 0.3 * p, 0.77 + 0.18 * p, 0.93 + 0.07 * p);
  };

  return { root, update, dispose: disposeTree(root) };
};

// ---------------------------------------------------------------------------
// sunrise meadow
// ---------------------------------------------------------------------------
const buildSunrise = (): Built => {
  const root = new THREE.Group();
  const b = new Batch();
  const grassMat = lam({ map: meadowGold() });
  const grassTint = lam({ map: meadowGold(), color: "#d9d29a" });
  const dirt = lam({ map: yardDirt() });
  const bark = lam({ map: oldWood() });
  const leafA = lam({ color: "#6e7a32" });
  const leafB = lam({ color: "#89933f" });
  const flowers = [lam({ color: "#f5e28a" }), lam({ color: "#f5f1df" }), lam({ color: "#e2b257" })];

  // meadow
  b.add(floor(-45, 45, -50, 18, 0, 16, 16), grassMat);
  // a soft dirt path winding toward the horizon, built as one smooth ribbon
  {
    const pathN = 56;
    const pv: number[] = [], puv: number[] = [], pidx: number[] = [];
    for (let i = 0; i <= pathN; i++) {
      const z = 6 - i * 1.1;
      const cx = 1.45 + Math.sin((z + 0.3) * 0.12) * 0.8;
      const hw = 0.82 + 0.12 * Math.sin(i * 0.4);
      pv.push(cx - hw, 0.012, z, cx + hw, 0.012, z);
      puv.push(0, i * 0.52, 1, i * 0.52);
      if (i < pathN) {
        const a = i * 2;
        pidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pv, 3));
    pg.setAttribute("uv", new THREE.Float32BufferAttribute(puv, 2));
    pg.setIndex(pidx);
    pg.computeVertexNormals();
    const pathMesh = new THREE.Mesh(pg, dirt);
    pathMesh.receiveShadow = true;
    root.add(pathMesh);
  }

  // low rolling hills
  for (const [x, z, r, h] of [[-18, -42, 26, 5], [14, -48, 32, 7], [36, -40, 22, 4], [-38, -36, 20, 3.5]] as const) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), grassTint);
    hill.position.set(x, -1, z);
    hill.scale.set(r, h, r * 0.7);
    hill.receiveShadow = true;
    root.add(hill);
  }

  // distant tree line
  for (let i = 0; i < 17; i++) {
    const x = -26 + i * 3.4;
    const z = -28 - (i % 4) * 3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 2.4, 5), bark);
    trunk.position.set(x, 1.2, z); trunk.castShadow = true; root.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.25 + (i % 3) * 0.25, 8, 7), i % 2 ? leafA : leafB);
    crown.position.set(x, 3.2 + (i % 3) * 0.2, z); crown.scale.y = 1.2; root.add(crown);
  }

  // large framing tree pushed far right and back so it never reads as a fence
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.2, 7), bark);
  trunk.position.y = 2.1; trunk.castShadow = true; tree.add(trunk);
  for (const [dx, dy, dz, r] of [[0, 4.5, 0, 1.8], [-1.1, 3.9, 0.3, 1.25], [1.0, 4.0, -0.2, 1.35], [0.2, 5.2, 0.4, 1.1]] as const) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 8), (dx + dy) % 2 ? leafA : leafB);
    c.position.set(dx, dy, dz); c.scale.y = 0.9; c.castShadow = true; tree.add(c);
  }
  tree.position.set(9.5, 0, -24);
  root.add(tree);

  // foreground grass clumps and flowers
  const rand = rng(5111);
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (1.1 + rand() * 2.6);
    const z = 1.3 + rand() * 2.7;
    const h = 0.18 + rand() * 0.5;
    b.add(new THREE.ConeGeometry(0.025, h, 3), grassTint, M(x, h / 2, z, (rand() - 0.5) * 0.35, rand() * 3, (rand() - 0.5) * 0.35));
  }
  for (let i = 0; i < 45; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (1.2 + rand() * 3.0);
    const z = 1.8 + rand() * 3.2;
    b.add(new THREE.SphereGeometry(0.025 + rand() * 0.02, 5, 4), flowers[i % 3], M(x, 0.18 + rand() * 0.3, z));
  }

  // birds in the far sky
  const birds: { m: THREE.Line; ph: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.55, 0.1, 0, 0, 0, 0, 0, 0, 0, 0.55, 0.1, 0], 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#2f2b28", transparent: true, opacity: 0.72 }));
    line.layers.set(NOINK);
    line.position.set(-12 + i * 4.2, 7.5 + (i % 3) * 1.6, -23 - (i % 4) * 2);
    line.scale.setScalar(0.9 + (i % 2) * 0.35);
    root.add(line);
    birds.push({ m: line, ph: i * 0.8 });
  }

  // pollen in the warm air
  const pn = 90;
  const ppos = new Float32Array(pn * 3);
  const pbase: [number, number, number, number][] = [];
  for (let i = 0; i < pn; i++) {
    const x = (rand() - 0.5) * 9;
    const y = 0.35 + rand() * 3.2;
    const z = -4 + rand() * 6;
    pbase.push([x, y, z, 0.3 + rand()]);
    ppos[i * 3] = x; ppos[i * 3 + 1] = y; ppos[i * 3 + 2] = z;
  }
  const pollen = points(ppos, "#ffe9a9", 0.03);
  root.add(pollen);

  b.build(root);

  const update = (frame: number, fps: number) => {
    const t = frame / fps;
    for (const bd of birds) {
      bd.m.position.x += 0; // deterministic age handled below
      bd.m.position.y = 7.5 + Math.sin(t * 0.5 + bd.ph) * 0.12;
      bd.m.position.x = -12 + ((t * 0.45 + bd.ph * 3) % 34);
    }
    const arr = pollen.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pn; i++) {
      const [x, y, z, sp] = pbase[i];
      arr[i * 3] = x + Math.sin(t * 0.24 * sp + i) * 0.55;
      arr[i * 3 + 1] = y + Math.sin(t * 0.16 * sp + i * 1.7) * 0.3;
      arr[i * 3 + 2] = z + Math.cos(t * 0.2 * sp + i) * 0.35;
    }
    pollen.geometry.attributes.position.needsUpdate = true;
    tree.rotation.z = 0.006 * Math.sin(t * 0.8);
  };

  return { root, update, dispose: disposeTree(root) };
};

function disposeTree(root: THREE.Object3D) {
  return () => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      mats.forEach((mm) => mm.dispose());
    });
  };
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------
export type ShawshankStageProps = { scene: CodeScene; episode: Episode };

export const ShawshankStage: React.FC<ShawshankStageProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mode = (scene.options?.mode as string) ?? "hook";

  const built = useMemo<Built>(() => {
    switch (mode) {
      case "yard":
      case "prison_yard":
        return buildYard();
      case "storm":
      case "freedom_storm":
        return buildStorm();
      case "sunrise":
      case "freedom_sunrise":
        return buildSunrise();
      case "poster":
      case "cell_poster":
        return buildCell("poster");
      case "chip":
      case "cell_chipping":
        return buildCell("chip");
      case "breach":
      case "cell_breach":
        return buildCell("breach");
      case "hook":
      case "cell_hook":
      default:
        return buildCell("hook");
    }
  }, [mode]);

  React.useEffect(() => () => built.dispose(), [built]);
  built.update(frame, fps);

  return <primitive object={built.root} dispose={null} />;
};
