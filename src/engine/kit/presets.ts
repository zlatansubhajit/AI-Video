// Kit presets: story-agnostic sets assembled from the primitives. A preset is
// plain data once built; the manifest only names it.
import * as THREE from "three";
import { rep, roofHD, stoneHD, facadeHD, cobbleHD, grassHD } from "../textures/paint";
import { Batch, V, boxGeo, floor, lam } from "./batch";
import { addGround, backdrop, barrel, bench, bollard, crate, distantHills, flowerBed, fountain, gazebo, hedge, hill, lamp, planter, signpost, stall, trashBin, tree, water, Water, updateWater, weatherGround, coniferTree, rockBoulder, tent, campfire } from "./primitives";
import type { WeatherName } from "../shot/types";

export type KitStage = {
  root: THREE.Group;
  /** feet height at the main acting spot */
  ground: number;
  /** seconds since the episode started; only used for cheap ambient motion */
  update?: (seconds: number) => void;
  waters?: Water[];
};

export type KitPreset = (options?: Record<string, unknown>) => KitStage;
const num = (o: Record<string, unknown> | undefined, k: string, d: number) => (typeof o?.[k] === "number" ? (o[k] as number) : d);
const weatherOf = (o: Record<string, unknown> | undefined): WeatherName | undefined =>
  o?.weather === "rain" || o?.weather === "snow" ? o.weather : undefined;

// ---------------- park-lawn ----------------
const parkLawn: KitPreset = (options) => {
  const root = new THREE.Group();
  const b = new Batch();
  const size = num(options, "size", 180);
  const weather = weatherOf(options);
  const snow = weather === "snow";
  const tr = (x: number, z: number, s: number, seed: number) => tree(b, x, z, s, 0, seed, snow);
  backdrop(b);
  distantHills(b, 150, 11);
  addGround(b, size, size, "lawn", Math.round(size / 2));
  // a cobbled path down the middle, with a small apron at the acting spot
  b.add(floor(-2.6, 2.6, -size / 2, size / 2, 0.006, 3, size / 2), lam("kit/cobble", () => ({ map: cobbleHD() })));
  b.add(floor(-4.5, 4.5, -4.5, 4.5, 0.008, 5, 5), lam("kit/cobble", () => ({ map: cobbleHD() })));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.15;
    const r = 24 + (i % 4) * 6;
    tr(Math.cos(a) * r, -4 + Math.sin(a) * r, 0.85 + (i % 3) * 0.18, i);
  }
  // near framing trees: depth between the lens and the set
  tr(10.5, 4.5, 1.05, 70);
  tr(-10, 4, 1.2, 71);
  tr(14, -4, 0.95, 72);
  for (let i = 0; i < 5; i++) tr(-34 - i * 5, -46 - (i % 2) * 6, 1.15, i + 40);
  for (let i = 0; i < 5; i++) tr(34 + i * 5, -46 - (i % 2) * 6, 1.1, i + 50);
  bench(b, -8.5, 5, 0.55);
  bench(b, 8.5, -5, -0.55);
  bench(b, -7, -14, 0.2);
  lamp(b, 9.5, 6.5);
  lamp(b, -9.5, -9);
  lamp(b, 0.2, 22);
  lamp(b, 0.2, -24);
  planter(b, -12, 12);
  planter(b, 12, -12);
  hedge(b, -18, -6, -24, -23.4, 0.9);
  hedge(b, 6, 18, -24, -23.4, 0.9);
  if (snow) {
    const cap = lam("kit/snowCap", () => ({ color: "#eef4fa" }));
    b.add(boxGeo(V(-18, 0.9, -24.02), V(-6, 0.99, -23.38), 1), cap);
    b.add(boxGeo(V(6, 0.9, -24.02), V(18, 0.99, -23.38), 1), cap);
  }
  // a park kiosk with delivery crates, off to the side of the acting spot
  stall(b, 12.5, -7.5, -0.5, 1, "#4a7a63", "#f0e2c8");
  crate(b, 14.2, 0, -6.1, 0.9);
  crate(b, 14.2, 0.81, -6.1, 0.8);
  barrel(b, 10.6, 0, -8.9, 0.9);
  // bandstand and bedding
  gazebo(b, -14, -17, 2.4);
  flowerBed(b, -3.4, 2.6);
  flowerBed(b, -6.5, -6.5, 2.1, 1.2);
  flowerBed(b, -3.0, -11.5, 2.4, 1.1);
  hill(b, -40, -78, 46, 6, -0.4);
  hill(b, 48, -86, 40, 5, -0.4);
  signpost(b, -8.6, -7.5, 0.7);
  trashBin(b, -7.2, -12.4);
  if (weather) root.add(weatherGround(size, size, weather));
  b.build(root);
  return { root, ground: 0 };
};

// ---------------- riverside ----------------
const riverside: KitPreset = (options) => {
  const root = new THREE.Group();
  const b = new Batch();
  const len = num(options, "length", 220);
  const riverW = num(options, "riverWidth", 22);
  const weather = weatherOf(options);
  const half = riverW / 2;
  // backdrop must stay below the water surface, or it hides the river
  backdrop(b, 700, -1.6);
  distantHills(b, 170, 9, 1);
  for (const s of [-1, 1]) {
    const x0 = s * half, x1 = s * (half + 70);
    b.add(floor(Math.min(x0, x1), Math.max(x0, x1), -len / 2, len / 2, 0, 14, len / 5),
      lam("kit/lawn", () => ({ map: grassHD() })));
    // cobbled walkway along the water
    b.add(floor(Math.min(s * half, s * (half + 4.5)), Math.max(s * half, s * (half + 4.5)), -len / 2, len / 2, 0.012, 4, len / 2),
      lam("kit/cobble", () => ({ map: cobbleHD() })));
    // embankment: stone face down to the water plus a low parapet
    b.add(boxGeo(V(Math.min(s * half, s * (half - 0.5)), -1.4, -len / 2), V(Math.max(s * half, s * (half - 0.5)), 0.18, len / 2), 2),
      lam("kit/stone", () => ({ map: stoneHD("kit/wall", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") })));
    b.add(boxGeo(V(Math.min(s * (half + 4.2), s * (half + 4.8)), 0, -len / 2), V(Math.max(s * (half + 4.2), s * (half + 4.8)), 0.55, len / 2), 2),
      lam("kit/cope", () => ({ map: stoneHD("kit/cope", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") })));
    for (let i = 0; i < 12; i++) {
      const z = -len / 2 + 12 + i * (len - 24) / 11;
      tree(b, s * (half + 13 + (i % 3) * 5), z, 0.9 + (i % 3) * 0.15, 0, i + (s > 0 ? 20 : 0));
    }
    for (let i = 0; i < 5; i++) lamp(b, s * (half + 5.8), -len / 2 + 18 + i * (len - 36) / 4);
    bench(b, s * (half + 3.6), -14, s > 0 ? -Math.PI / 2 : Math.PI / 2);
    bench(b, s * (half + 3.6), 16, s > 0 ? -Math.PI / 2 : Math.PI / 2);
    planter(b, s * (half + 9), -26);
    planter(b, s * (half + 9), 28);
    if (s > 0) {
      stall(b, half + 9, -6, -Math.PI / 2, 1, "#b4593f", "#f0e2c8");
      crate(b, half + 10.6, 0, -4.4, 0.9);
      barrel(b, half + 7.2, 0, -7.8, 0.85);
    }
    for (const z of [-22, -2, 18]) bollard(b, s * (half + 1.2), z);
    trashBin(b, s * (half + 2.2), 6);
    signpost(b, s * (half + 2.4), -9, s > 0 ? 0.2 : Math.PI - 0.2);
    hill(b, s * 60, -len / 2 - 6, 45, 6, -0.4);
  }
  const w = water(riverW + 0.4, len + 40, 0, 0, -0.62, 10);
  root.add(w.mesh);
  if (weather) for (const s of [-1, 1]) root.add(weatherGround(72, len, weather).translateX(s * (half + 35.5)));
  b.build(root);
  return {
    root, ground: 0, waters: [w],
    update: (seconds) => updateWater([w], seconds),
  };
};

// ---------------- city-square ----------------
type Block = { x: number; z: number; w: number; d: number; h: number; yaw: number; wall: string; roof: string };

/** facade quad in local building space, from x0 to x0+w, y 0..h, at depth z */
const quadLocal = (x0: number, h: number, w: number, z: number) => {
  const g = new THREE.BufferGeometry();
  const a = V(x0, 0, z), b = V(x0 + w, 0, z), c = V(x0 + w, h, z), d = V(x0, h, z);
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  return g;
};

const citySquare: KitPreset = (options) => {
  const root = new THREE.Group();
  const b = new Batch();
  const size = num(options, "size", 80);
  const weather = weatherOf(options);
  backdrop(b);
  distantHills(b, 170, 9, 2);
  addGround(b, size, size, "cobble", Math.round(size / 3));
  b.add(floor(-11, 11, -11, 15, 0.01, 11, 13), lam("kit/paving", () => ({ map: stoneHD("kit/paving", ["#cfc4b0", "#c6bba6", "#d8cdb9", "#bdb29e"], "#a89c88") })));
  fountain(b, 0, -7, 3.2);

  const walls = ["#d8c7a8", "#cbb48f", "#e0d2b8", "#c7a98e"];
  const roofs = ["#8d4b3c", "#6c5a63", "#7d5340", "#5d6470"];
  const shutters = ["#3e6b57", "#6b4a3e", "#4a5f7a", "#7a5a3e"];
  const blocks: Block[] = [];
  for (let i = 0; i < 4; i++) {
    const x = -24 + i * 16, w = 15, h = 8 + (i % 2) * 1.5;
    blocks.push({ x, z: -36, w, d: 11, h, yaw: 0, wall: walls[i % 4], roof: roofs[i % 4] });
    blocks.push({ x, z: 34, w, d: 11, h, yaw: Math.PI, wall: walls[(i + 1) % 4], roof: roofs[(i + 1) % 4] });
  }
  blocks.push({ x: -34, z: 0, w: 15, d: 11, h: 9.5, yaw: Math.PI / 2, wall: walls[2], roof: roofs[2] });
  blocks.push({ x: 34, z: 0, w: 15, d: 11, h: 9.5, yaw: -Math.PI / 2, wall: walls[0], roof: roofs[0] });

  blocks.forEach((bl, i) => {
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), bl.yaw);
    const M = new THREE.Matrix4().compose(V(bl.x, 0, bl.z), q, V(1, 1, 1));
    const stone = lam("kit/block:" + bl.wall, () => ({ map: stoneHD("kit/block:" + bl.wall, [bl.wall, "#c2ab8d", "#dbcdb4", "#b9a184"], "#9c8d78"), color: "#d9d1c3" }));
    b.add(boxGeo(V(-bl.w / 2, 0, -bl.d / 2), V(bl.w / 2, bl.h, bl.d / 2), 3), stone, M.clone());
    // painted street facade on the inward face (1 cm proud of the wall)
    const face = facadeHD(`kit${i}`, bl.w, bl.h, { wall: bl.wall, shutter: shutters[i % 4], door: true, shop: true });
    b.add(quadLocal(-bl.w / 2, bl.h, bl.w, bl.d / 2 + 0.01), lam("kit/facade" + i, () => ({ map: face })), M.clone());
    // stylised pyramid roof (4-sided cone, footprint scaled to the block)
    const roofMat = lam("kit/roof:" + bl.roof, () => ({ map: roofHD(bl.roof) }));
    const roof = new THREE.ConeGeometry(1, 1, 4);
    roof.rotateY(Math.PI / 4);
    roof.scale((bl.w / 2 + 0.55) / 0.7071, 3.0, (bl.d / 2 + 0.55) / 0.7071);
    b.add(roof, roofMat, new THREE.Matrix4().compose(V(bl.x, bl.h + 1.5, bl.z), q, V(1, 1, 1)));
    b.add(boxGeo(V(-0.45, bl.h + 2.8, -0.45), V(0.45, bl.h + 4.2, 0.45)), stone, M.clone());
  });

  // square furniture around the fountain
  for (const [x, z] of [[10, 10], [-10, 10], [10, -10], [-10, -10]]) lamp(b, x, z);
  bench(b, -8, 4, Math.PI / 2);
  bench(b, 8, 4, -Math.PI / 2);
  bench(b, 7, -9, Math.PI * 0.8);
  for (const [x, z] of [[16, 14], [-16, 14], [16, -14], [-16, -14]]) planter(b, x, z, 1.5);
  // market stalls on the plaza edge (face inward: +x on the left, -x on the right)
  stall(b, -14, 6, Math.PI / 2, 1, "#b4593f", "#f0e2c8");
  stall(b, 14, 6, -Math.PI / 2, 1, "#3f6b57", "#e8dcc0");
  stall(b, -14, -8, Math.PI / 2, 0.9, "#4a5f7a", "#efe3c9");
  crate(b, -12.2, 0, 8.6, 0.9);
  crate(b, -12.2, 0.81, 8.6, 0.8);
  crate(b, 12.4, 0, 3.2, 0.95);
  barrel(b, 12.6, 0, 8.3, 0.9);
  barrel(b, -12.4, 0, -10.2, 0.85);
  // fountain ring of bollards, signs and bins
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    bollard(b, Math.cos(a) * 5.2, -7 + Math.sin(a) * 5.2);
  }
  signpost(b, -7.6, 9.4, -0.35);
  signpost(b, 17, -2, Math.PI * 0.72);
  trashBin(b, -9.4, 2.6);
  trashBin(b, 9.6, -2.4);
  if (weather) root.add(weatherGround(size, size, weather));
  b.build(root);
  return { root, ground: 0 };
};

// ---------------- woods-camp ----------------
const woodsCamp: KitPreset = (options) => {
  const root = new THREE.Group();
  const b = new Batch();
  const size = num(options, "size", 160);
  const mode = (options?.mode as string) ?? "trail";
  const weather = weatherOf(options);

  backdrop(b, 500, -0.06);
  distantHills(b, 140, 12, 5);

  // Ground: forest dirt & wild mossy grass
  addGround(b, size, size, "forest", Math.round(size / 3));

  // Hiking trail through the woods (winding packed dirt path):
  const trailMat = lam("kit/trailDirt", () => ({ color: "#7a5c3e" }));
  const trailWidth = 2.4;
  for (let z = -size / 2; z < size / 2; z += 4) {
    const xMid = Math.sin(z * 0.08) * 3.5;
    b.add(floor(xMid - trailWidth / 2, xMid + trailWidth / 2, z, z + 4.1, 0.008, 1, 1), trailMat);
  }

  // Pine forest vegetation (tiered conifer trees + boulders):
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.1;
    const r = 18 + (i % 5) * 6;
    coniferTree(b, Math.cos(a) * r, Math.sin(a) * r, 0.95 + (i % 4) * 0.22, 0, i + 10);
  }

  // Side framing pine trees:
  coniferTree(b, -8.5, 5.5, 1.3, 0, 42);
  coniferTree(b, 9.2, 4.2, 1.25, 0, 43);
  coniferTree(b, -12, -4.5, 1.4, 0, 44);
  coniferTree(b, 11.5, -5.0, 1.35, 0, 45);

  // Granite boulders:
  rockBoulder(b, -4.8, 4.2, 1.1, 0, 1);
  rockBoulder(b, 5.6, -3.8, 1.3, 0, 2);
  rockBoulder(b, -6.2, -5.5, 0.85, 0, 3);
  rockBoulder(b, 7.2, 3.5, 0.9, 0, 4);

  // Camp items depending on mode:
  if (mode === "camp_fire" || mode === "camp_sunset") {
    // Pitch tent in the background behind the campfire so it's fully visible
    tent(b, 0.2, -1.2, 0, 1.25, "#d35400");
    campfire(b, -0.2, 2.2, true, 1.1);
    const logMat = lam("kit/seatingLog", () => ({ color: "#4a3525" }));
    const logA = new THREE.CylinderGeometry(0.18, 0.18, 2.2, 8);
    logA.rotateZ(Math.PI / 2);
    b.add(logA, logMat, new THREE.Matrix4().makeTranslation(-1.6, 0.16, 2.2));
    const logB = new THREE.CylinderGeometry(0.18, 0.18, 2.0, 8);
    logB.rotateZ(Math.PI / 2);
    b.add(logB, logMat, new THREE.Matrix4().makeTranslation(1.3, 0.16, 2.2));
  } else if (mode === "fire_die") {
    campfire(b, -0.2, 2.2, true, 1.3);
  } else if (mode === "pup_rescue") {
    rockBoulder(b, 0.0, 6.0, 1.6, 0, 7);
    rockBoulder(b, 1.8, 5.2, 1.1, 0, 8);
    coniferTree(b, -2.6, 5.0, 1.2, 0, 48);
  } else if (mode === "tent_sleep" || mode === "tent_wolf" || mode === "fear_cu" || mode === "tent_zipper") {
    // Tent with open entrance facing camera, extinguished campfire with cold charcoal embers to the side
    tent(b, 0.2, -1.2, 0, 1.25, "#d35400");
    campfire(b, -2.4, 1.2, false, 0.95);
    const logMat = lam("kit/seatingLog", () => ({ color: "#4a3525" }));
    const log = new THREE.CylinderGeometry(0.18, 0.18, 2.2, 8);
    log.rotateZ(Math.PI / 2);
    b.add(log, logMat, new THREE.Matrix4().makeTranslation(-2.4, 0.16, 0.2));
  }

  if (weather) root.add(weatherGround(size, size, weather));
  b.build(root);

  let fireLight: THREE.PointLight | null = null;
  let tentLantern: THREE.PointLight | null = null;
  if (mode === "camp_fire" || mode === "camp_sunset") {
    fireLight = new THREE.PointLight("#ff7700", 3.2, 18, 1.2);
    fireLight.position.set(-0.2, 0.8, 2.2);
    fireLight.castShadow = true;
    root.add(fireLight);
  } else if (mode === "fire_die") {
    fireLight = new THREE.PointLight("#ff4400", 2.4, 10, 1.2);
    fireLight.position.set(-0.2, 0.6, 2.2);
    root.add(fireLight);
  } else if (mode === "tent_sleep" || mode === "tent_wolf" || mode === "fear_cu" || mode === "tent_zipper") {
    // Soft warm lantern light inside the tent for clear visibility
    tentLantern = new THREE.PointLight("#ffb050", 1.2, 6, 1.2);
    tentLantern.position.set(0.2, 0.8, -1.0);
    root.add(tentLantern);
  }

  return {
    root,
    ground: 0,
    update: (seconds) => {
      if (fireLight) {
        fireLight.intensity = 2.8 + Math.sin(seconds * 14) * 0.45 + Math.sin(seconds * 27) * 0.25;
      }
      if (tentLantern) {
        tentLantern.intensity = 1.1 + Math.sin(seconds * 4) * 0.1;
      }
    },
  };
};

export const KIT_PRESETS: Record<string, KitPreset> = {
  "park-lawn": parkLawn,
  riverside,
  "city-square": citySquare,
  "woods-camp": woodsCamp,
};
