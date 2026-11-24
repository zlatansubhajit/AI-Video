// Reusable kit primitives: sky dome, clouds, sun sprites, ground, trees, lamps,
// benches, hedges, hills and water. They are deliberately plain three.js
// objects so a preset can merge them into a couple of static meshes.
import * as THREE from "three";
import { ctex, cloudHD, rep, grassHD, cobbleHD, stoneHD, rng } from "../textures/paint";
import { LOOK, LightPreset } from "../look/lights";
import { untone } from "../look/shade";
import { NOINK } from "../look/ink";
import type { LightName, WeatherName } from "../shot/types";
import { Batch, V, boxGeo, floor, lam, phong } from "./batch";

const deg = THREE.MathUtils.degToRad;

// ---------------- sky ----------------
export type Sky = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial };

export const skyDome = (): Sky => {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
      c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
    },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
      void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
        vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
        c = mix(c, c2, smoothstep(e.x, e.y, el));
        c = mix(c, c3, smoothstep(e.y, e.z, el));
        c = mix(c, c4, smoothstep(e.z, e.w, el));
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), mat);
  mesh.renderOrder = -1; mesh.frustumCulled = false; mesh.layers.set(NOINK);
  return { mesh, mat };
};

/** writes the five sky stops for a light preset (tone-map inverted, like the bridge) */
export const shadeSky = (sky: Sky, light: LightName) => {
  const K = LOOK[light], su = sky.mat.uniforms;
  K.sky.c.forEach((h, i) => untone(h, su["c" + i].value as THREE.Color));
  const e = K.sky.e.map((d) => deg(d));
  su.e.value.set(e[1], e[2], e[3], e[4]);
};

export type Clouds = { group: THREE.Group; planes: THREE.Mesh[]; maps: Record<LightName, THREE.Texture[]> };

export const cloudField = (): Clouds => {
  const maps = {
    day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)),
    golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
    overcast: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.overcast.cloud)),
    night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)),
  };
  const group = new THREE.Group();
  const planes: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3, d = 760 + (i % 4) * 55;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: maps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false,
    }));
    const w = 150 + (i % 5) * 34;
    m.position.set(Math.cos(a) * d, 95 + (i % 5) * 24, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
    m.layers.set(NOINK);
    group.add(m); planes.push(m);
  }
  return { group, planes, maps };
};

/** faces the clouds at the camera and swaps palettes for the active light */
export const updateClouds = (c: Clouds, light: LightName, camera: THREE.Camera) => {
  for (let i = 0; i < c.planes.length; i++) {
    const m = c.planes[i];
    m.lookAt(camera.position.x, m.position.y, camera.position.z);
    (m.material as THREE.MeshBasicMaterial).map = c.maps[light][i % 4];
  }
};

// ---------------- sun ----------------
const discTex = () => ctex("kit/sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("kit/sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

export type SunSprites = { disc: THREE.Sprite; halo: THREE.Sprite };

export const sunSprites = (): SunSprites => {
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthTest: true,
    transparent: true, blending: THREE.AdditiveBlending }));
  disc.renderOrder = -0.5; halo.renderOrder = 5;
  for (const m of [disc, halo]) { m.frustumCulled = false; m.layers.set(NOINK); }
  return { disc, halo };
};

export const placeSun = (s: SunSprites, camera: THREE.Camera, sunDir: THREE.Vector3, L: LightPreset, light: LightName) => {
  const on = light === "golden" || light === "night";
  s.disc.visible = s.halo.visible = on;
  if (!on) return;
  s.disc.position.copy(camera.position).addScaledVector(sunDir, 900);
  const ang = light === "night" ? 1.4 : 1.7;
  s.disc.scale.setScalar(2 * 900 * Math.tan(deg(ang)));
  s.halo.position.copy(s.disc.position);
  s.halo.scale.setScalar(2 * 900 * Math.tan(deg(light === "night" ? 18 : 24)));
  (s.disc.material as THREE.SpriteMaterial).color.set(light === "night" ? "#ffffff" : "#ffffff");
  (s.halo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(light === "night" ? 0.9 : 1.3);
};

// ---------------- ground surfaces ----------------
/** large lawn / plaza / sand plane with a tiled painted texture */
export const addGround = (b: Batch, w: number, d: number, kind: "lawn" | "cobble" | "sand" | "forest", repeat: number, y = 0) => {
  if (kind === "lawn") b.add(floor(-w / 2, w / 2, -d / 2, d / 2, y, repeat, repeat), lam("kit/lawn", () => ({ map: grassHD(), color: "#9aae83" })));
  else if (kind === "cobble") b.add(floor(-w / 2, w / 2, -d / 2, d / 2, y, repeat, repeat), lam("kit/cobble", () => ({ map: cobbleHD(), color: "#b4a693" })));
  else if (kind === "forest") b.add(floor(-w / 2, w / 2, -d / 2, d / 2, y, repeat, repeat), lam("kit/forestFloor", () => ({ color: "#424d32" })));
  else b.add(floor(-w / 2, w / 2, -d / 2, d / 2, y, repeat, repeat), lam("kit/sand", () => ({ color: "#e2c992" })));
};

// ---------------- vegetation and street furniture ----------------
const bark = () => lam("kit/bark", () => ({ color: "#8a5a3c" }));
const leaf = () => lam("kit/leaf", () => ({ color: "#62ae4c" }));
const leafDark = () => lam("kit/leafDark", () => ({ color: "#4a9142" }));

const sph = (r: number, sx = 1, sy = 1, sz = 1) => {
  const g = new THREE.SphereGeometry(r, 12, 8);
  g.scale(sx, sy, sz);
  return g;
};

/** one broadleaf tree; ~4 merged meshes worth of geometry, no extra draw calls.
 *  `snow` adds white caps to the three canopy blobs (winter variants). */
export const tree = (b: Batch, x: number, z: number, s = 1, y = 0, seed = 0, snow = false) => {
  const sway = 0.06 * Math.sin(seed * 5.1), rot = seed * 2.7;
  b.add(new THREE.CylinderGeometry(0.13 * s, 0.22 * s, 1.9 * s, 7), bark(),
    new THREE.Matrix4().compose(V(x, y + 0.95 * s, z), new THREE.Quaternion(), V(1, 1, 1)));
  b.add(sph(1.15 * s, 1, 0.9, 1), leaf(),
    new THREE.Matrix4().compose(V(x + sway, y + 2.55 * s, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rot), V(1, 1, 1)));
  b.add(sph(0.85 * s), leafDark(),
    new THREE.Matrix4().compose(V(x + 0.55 * s + sway, y + 2.95 * s, z + 0.2 * s), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rot + 1), V(1, 1, 1)));
  b.add(sph(0.75 * s), leaf(),
    new THREE.Matrix4().compose(V(x - 0.5 * s + sway, y + 2.9 * s, z - 0.25 * s), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rot + 2), V(1, 1, 1)));
  if (snow) {
    const cap = lam("kit/snowCap", () => ({ color: "#eef4fa" }));
    const put = (px: number, py: number, pz: number, r: number, k: number) =>
      b.add(sph(r, 1.02, k, 1.02), cap, new THREE.Matrix4().makeTranslation(px, py, pz));
    put(x + sway, y + 3.02 * s, z, 1.16 * s, 0.38);
    put(x + 0.55 * s + sway, y + 3.22 * s, z + 0.2 * s, 0.86 * s, 0.36);
    put(x - 0.5 * s + sway, y + 3.16 * s, z - 0.25 * s, 0.76 * s, 0.36);
  }
};

const iron = () => phong("kit/iron", () => ({ color: "#3d414c", specular: "#8a8a8a", shininess: 60 }));
const wood = () => lam("kit/wood", () => ({ color: "#a8724a" }));
const lampGlass = () => lam("kit/lampGlass", () => ({ color: "#ffe3b0", emissive: "#ffbe63", emissiveIntensity: 0.55 }));
const crateMat = () => lam("kit/crate", () => ({ color: "#b98a56" }));
const hoopMat = () => lam("kit/hoop", () => ({ color: "#6a6f78" }));
const cloth = (hex: string) => lam("kit/cloth:" + hex, () => ({ color: hex }));

/** a cast-iron street lamp with a warm pane */
export const lamp = (b: Batch, x: number, z: number, y = 0, s = 1) => {
  b.add(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 0.35 * s, 8), iron(), new THREE.Matrix4().makeTranslation(x, y + 0.17 * s, z));
  b.add(new THREE.CylinderGeometry(0.09 * s, 0.12 * s, 3.2 * s, 8), iron(), new THREE.Matrix4().makeTranslation(x, y + 1.8 * s, z));
  b.add(boxGeo(V(x - 0.06 * s, y + 3.3 * s, z - 0.06 * s), V(x + 0.06 * s, y + 3.55 * s, z + 0.06 * s)), iron());
  b.add(boxGeo(V(x - 0.26 * s, y + 3.55 * s, z - 0.26 * s), V(x + 0.26 * s, y + 3.95 * s, z + 0.26 * s)), lampGlass());
  b.add(new THREE.ConeGeometry(0.34 * s, 0.26 * s, 4), iron(),
    new THREE.Matrix4().compose(V(x, y + 4.08 * s, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 4), V(1, 1, 1)));
};

/** slatted bench with iron legs; yaw in radians */
export const bench = (b: Batch, x: number, z: number, yaw = 0, y = 0, s = 1) => {
  const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw);
  const M = new THREE.Matrix4().compose(V(x, y, z), q, V(1, 1, 1));
  const seat = (dz: number) => boxGeo(V(-0.9 * s, 0.45 * s, -0.2 * s + dz), V(0.9 * s, 0.51 * s, 0.06 * s + dz));
  for (const dz of [0, 0.17, 0.34]) b.add(seat(dz), wood(), M.clone());
  b.add(boxGeo(V(-0.9 * s, 0.55 * s, 0.34 * s), V(0.9 * s, 0.62 * s, 0.4 * s)), wood(), M.clone());
  b.add(boxGeo(V(-0.88 * s, 0.68 * s, 0.38 * s), V(0.88 * s, 0.9 * s, 0.44 * s)), wood(), M.clone());
  for (const dx of [-0.78, 0.78]) {
    b.add(boxGeo(V(dx - 0.05, 0, -0.28 * s), V(dx + 0.05, 0.48 * s, 0.1 * s)), iron(), M.clone());
    b.add(boxGeo(V(dx - 0.05, 0.5 * s, 0.34 * s), V(dx + 0.05, 0.92 * s, 0.42 * s)), iron(), M.clone());
  }
};

/** clipped hedge box (also useful as a low maze wall) */
export const hedge = (b: Batch, x0: number, x1: number, z0: number, z1: number, h = 0.9, y = 0) =>
  b.add(boxGeo(V(x0, y, z0), V(x1, y + h, z1), 1.2), leafDark());

/** cast-iron bollard: base, tapered shaft, collar and ball top */
export const bollard = (b: Batch, x: number, z: number, y = 0, s = 1) => {
  const m = (dy: number) => new THREE.Matrix4().makeTranslation(x, y + dy, z);
  b.add(new THREE.CylinderGeometry(0.13 * s, 0.16 * s, 0.12 * s, 8), iron(), m(0.06 * s));
  b.add(new THREE.CylinderGeometry(0.065 * s, 0.085 * s, 0.7 * s, 8), iron(), m(0.47 * s));
  b.add(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.05 * s, 8), iron(), m(0.84 * s));
  b.add(new THREE.SphereGeometry(0.085 * s, 10, 8), iron(), m(0.94 * s));
};

/** park bin: green drum, two dark bands and a lid */
export const trashBin = (b: Batch, x: number, z: number, y = 0, s = 1) => {
  const body = lam("kit/bin", () => ({ color: "#3f5a49" }));
  const m = (dy: number) => new THREE.Matrix4().makeTranslation(x, y + dy, z);
  b.add(new THREE.CylinderGeometry(0.3 * s, 0.26 * s, 0.82 * s, 10), body, m(0.45 * s));
  for (const dy of [0.2, 0.68])
    b.add(new THREE.CylinderGeometry(0.32 * s, 0.32 * s, 0.05 * s, 10), hoopMat(), m(dy * s));
  b.add(new THREE.CylinderGeometry(0.33 * s, 0.33 * s, 0.06 * s, 10), body, m(0.88 * s));
  b.add(new THREE.SphereGeometry(0.06 * s, 8, 6), hoopMat(), m(0.94 * s));
};

/** street sign: iron post with two enamelled plates (no lettering, reads at short distances) */
export const signpost = (b: Batch, x: number, z: number, yaw = 0, y = 0, s = 1) => {
  const M = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1));
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, local: THREE.Matrix4) => b.add(geo, mat, M.clone().multiply(local));
  const plate = lam("kit/sign", () => ({ color: "#e9e0c9" }));
  const edge = lam("kit/signEdge", () => ({ color: "#33544a" }));
  const letters = lam("kit/signInk", () => ({ color: "#3a423c" }));
  put(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 2.5 * s, 8), iron(), new THREE.Matrix4().makeTranslation(0, 1.25 * s, 0));
  put(new THREE.SphereGeometry(0.075 * s, 8, 6), iron(), new THREE.Matrix4().makeTranslation(0, 2.55 * s, 0));
  for (const [dy, w] of [[2.28, 0.95], [2.0, 0.74]] as const) {
    put(boxGeo(V(-w / 2, 0, -0.035), V(w / 2, 0.24, 0.035), 0.5), edge, new THREE.Matrix4().makeTranslation(0, dy * s, 0));
    put(boxGeo(V(-w / 2 + 0.03, 0.02, -0.065), V(w / 2 - 0.03, 0.22, 0.065), 0.5), plate, new THREE.Matrix4().makeTranslation(0, dy * s, 0));
    // three painted bars read as lettering at street distance
    for (let k = 0; k < 3; k++) {
      const y0 = 0.05 + k * 0.055, len = w * (0.52 - k * 0.1);
      put(boxGeo(V(-len / 2, y0, 0.066), V(len / 2, y0 + 0.03, 0.072), 0.5), letters, new THREE.Matrix4().makeTranslation(0, dy * s, 0));
    }
  }
};

/** mottled snow blanket: soft blue-grey shading over a near-white base */
const snowTex = () => ctex("kit/snowGround", 512, 512, (g, r) => {
  g.fillStyle = "#eef4fa"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) {
    const x = r() * 512, y = r() * 512, rad = 6 + r() * 44;
    const tone = r() > 0.45 ? "255,255,255" : "186,203,221";
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${tone},${0.08 + r() * 0.14})`);
    grd.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
});

/** precipitation ground treatment: wet sheen for rain, settled cover for snow.
 *  Returned outside the Batch because transparent sheets must not cast shadows
 *  (Batch.build flags every merged mesh as a caster). */
export const weatherGround = (w: number, d: number, weather: WeatherName, y = 0.02): THREE.Mesh => {
  const mat = weather === "rain"
    ? new THREE.MeshBasicMaterial({ color: "#2b3540", transparent: true, opacity: 0.18, depthWrite: false })
    : new THREE.MeshBasicMaterial({
        map: rep(snowTex(), Math.max(4, Math.round(w / 12)), Math.max(4, Math.round(d / 12))),
        color: "#ffffff", transparent: true, opacity: 0.68, depthWrite: false,
      });
  const mesh = new THREE.Mesh(floor(-w / 2, w / 2, -d / 2, d / 2, y, 1, 1), mat);
  mesh.renderOrder = 1;
  mesh.layers.set(NOINK); // a flat tint must not generate ink edges
  return mesh;
};

/** octagonal park bandstand: stone plinth, posts, two rail rings and a conical roof */
export const gazebo = (b: Batch, x: number, z: number, r = 2.3, y = 0, roof = "#3f6b57") => {
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, dy: number) =>
    b.add(geo, mat, new THREE.Matrix4().makeTranslation(x, y + dy, z));
  put(new THREE.CylinderGeometry(r * 1.12, r * 1.16, 0.28, 8), lam("kit/gazeboBase", () => ({ map: stoneHD("kit/gazeboBase") })), 0.14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const post = new THREE.CylinderGeometry(0.08, 0.1, 2.55, 6);
    post.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    put(post, wood(), 1.55);
  }
  // rails: two flat rings just above the plinth
  for (const dy of [0.75, 1.15]) {
    const ring = new THREE.TorusGeometry(r, 0.045, 5, 32);
    ring.rotateX(Math.PI / 2);
    put(ring, wood(), dy);
  }
  const cone = new THREE.ConeGeometry(r * 1.38, 1.15, 8);
  put(cone, lam("kit/gazeboRoof:" + roof, () => ({ color: roof })), 3.05);
  put(new THREE.SphereGeometry(0.16, 10, 6), lam("kit/gazeboFinial", () => ({ color: "#d8c37a" })), 3.72);
};

/** low stone flower bed with foliage and three colours of blooms */
export const flowerBed = (b: Batch, x: number, z: number, w = 1.8, d = 1.1, y = 0) => {
  const border = lam("kit/bedStone", () => ({ map: stoneHD("kit/bedStone", ["#d8ccb8", "#cec2ae", "#e0d4c0", "#c6baa6"], "#ab9f8c") }));
  const soil = lam("kit/soil", () => ({ color: "#5d4632" }));
  const green = lam("kit/foliage", () => ({ color: "#4f8a3f" }));
  b.add(boxGeo(V(x - w / 2, y, z - d / 2), V(x + w / 2, y + 0.2, z + d / 2), 0.9), border);
  b.add(floor(x - w / 2 + 0.12, x + w / 2 - 0.12, z - d / 2 + 0.12, z + d / 2 - 0.12, y + 0.21, 1, 1), soil);
  const cols = ["#d9534f", "#f0c04a", "#f3f0e6", "#c86bb0"];
  const rr = rng(Math.round(x * 37 + z * 91) + 7);
  for (let i = 0; i < 12; i++) {
    const px = x - w / 2 + 0.2 + rr() * (w - 0.4), pz = z - d / 2 + 0.2 + rr() * (d - 0.4);
    b.add(new THREE.SphereGeometry(0.1 + rr() * 0.05, 6, 4), green, new THREE.Matrix4().makeTranslation(px, y + 0.28, pz));
  }
  for (let i = 0; i < 18; i++) {
    const px = x - w / 2 + 0.2 + rr() * (w - 0.4), pz = z - d / 2 + 0.2 + rr() * (d - 0.4);
    b.add(new THREE.SphereGeometry(0.07 + rr() * 0.04, 6, 4), lam("kit/bloom:" + cols[i % 4], () => ({ color: cols[i % 4] })),
      new THREE.Matrix4().makeTranslation(px, y + 0.38, pz));
  }
};

/** market stall: counter, four posts, striped sloped canopy. yaw 0 faces +z. */
export const stall = (b: Batch, x: number, z: number, yaw = 0, s = 1, colour = "#c2554a", trim = "#f0e2c8") => {
  const M = new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1));
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, local = new THREE.Matrix4()) =>
    b.add(geo, mat, M.clone().multiply(local));
  const w = 2.6 * s, d = 1.9 * s, top = 2.35 * s;
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    put(new THREE.CylinderGeometry(0.055 * s, 0.065 * s, top, 6), wood(),
      new THREE.Matrix4().makeTranslation(sx * w * 0.46, top / 2, sz * d * 0.45));
  put(boxGeo(V(-w / 2, 0.95 * s, -d / 2 * 0.9), V(w / 2, 1.1 * s, d / 2 * 0.9)), wood());
  put(boxGeo(V(-w / 2, 0.25 * s, d / 2 * 0.86), V(w / 2, 0.95 * s, d / 2 * 0.9)), cloth("#9a7a54"));
  const qx = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 0.22);
  for (let i = 0; i < 7; i++)
    put(new THREE.BoxGeometry(w / 7, 0.055 * s, d * 1.08), i % 2 ? cloth(trim) : cloth(colour),
      new THREE.Matrix4().compose(V(-w / 2 + (i + 0.5) * (w / 7), top, 0), qx, V(1, 1, 1)));
};

/** wooden crate, 0.9 m cube scaled by s */
export const crate = (b: Batch, x: number, y: number, z: number, s = 1) =>
  b.add(boxGeo(V(-0.45 * s, 0, -0.45 * s), V(0.45 * s, 0.9 * s, 0.45 * s), 0.5 * s), crateMat(),
    new THREE.Matrix4().makeTranslation(x, y, z));

/** barrel with two iron hoops */
export const barrel = (b: Batch, x: number, y: number, z: number, s = 1) => {
  b.add(new THREE.CylinderGeometry(0.34 * s, 0.3 * s, 0.95 * s, 10), crateMat(),
    new THREE.Matrix4().makeTranslation(x, y + 0.48 * s, z));
  for (const dy of [0.24, 0.72])
    b.add(new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 0.07 * s, 10), hoopMat(),
      new THREE.Matrix4().makeTranslation(x, y + dy * s, z));
};

/** striped shop awning on a building facade; M is the building transform */
export const awning = (b: Batch, M: THREE.Matrix4, x0: number, width: number, y: number, z: number, colour = "#c2554a", trim = "#f0e2c8") => {
  const n = 6, sw = width / n;
  const qx = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 0.3);
  for (let i = 0; i < n; i++) {
    const local = new THREE.Matrix4().compose(V(x0 + (i + 0.5) * sw, y, z + 0.58), qx, V(1, 1, 1));
    b.add(new THREE.BoxGeometry(sw, 0.05, 1.2), i % 2 ? cloth(trim) : cloth(colour), M.clone().multiply(local));
  }
};

/** soft grass hill; the sphere is pushed below y so only the cap shows */
export const hill = (b: Batch, x: number, z: number, r: number, h: number, y = 0) => {
  const g = new THREE.SphereGeometry(1, 20, 12);
  g.scale(r, h, r);
  b.add(g, lam("kit/hill", () => ({ color: "#7fa06b" })), new THREE.Matrix4().makeTranslation(x, y, z));
};

/** a very large muted plane under the set so the ground has no visible edge */
export const backdrop = (b: Batch, size = 700, y = -0.05) =>
  b.add(floor(-size / 2, size / 2, -size / 2, size / 2, y, 1, 1), lam("kit/valley", () => ({ color: "#7f9f6a" })));

/** ring of soft hills at the horizon; fog does the rest */
export const distantHills = (b: Batch, radius = 160, count = 11, seed = 0) => {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.2 * seed;
    const r = radius + (i % 3) * 18;
    hill(b, Math.cos(a) * r, Math.sin(a) * r, 38 + (i % 4) * 9, 5 + (i % 3) * 2.5, -0.5);
  }
};

/** a round stone planter with a small tree */
export const planter = (b: Batch, x: number, z: number, r = 1.4, y = 0) => {
  b.add(new THREE.CylinderGeometry(r, r * 0.92, 0.55, 16), lam("kit/planter", () => ({ map: rep(cobbleHD(), 2, 1) })),
    new THREE.Matrix4().makeTranslation(x, y + 0.27, z));
  b.add(floor(x - r * 0.85, x + r * 0.85, z - r * 0.85, z + r * 0.85, y + 0.5, 1, 1), bark());
  tree(b, x, z, 0.8, y + 0.42, x + z);
};

/** a round stone fountain: basin, inner water disc, pedestal bowl and finial */
export const fountain = (b: Batch, x: number, z: number, r = 3.6, y = 0) => {
  const stone = lam("kit/fountainStone", () => ({ map: rep(stoneHD("kit/fountainStone"), 3, 1) }));
  const wet = phong("kit/fountainWater", () => ({ color: "#7fc4d8", specular: "#eaffff", shininess: 80 }));
  const m = (dy: number) => new THREE.Matrix4().makeTranslation(x, y + dy, z);
  b.add(new THREE.CylinderGeometry(r, r * 0.96, 0.68, 24), stone, m(0.34));
  b.add(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.12, 24), stone, m(0.12));
  b.add(new THREE.CylinderGeometry(r * 0.84, r * 0.84, 0.05, 24), wet, m(0.52));
  b.add(new THREE.CylinderGeometry(0.4, 0.5, 0.9, 12), stone, m(0.95));
  b.add(new THREE.CylinderGeometry(1.05, 0.82, 0.28, 20), stone, m(1.45));
  b.add(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 20), wet, m(1.6));
  b.add(new THREE.SphereGeometry(0.2, 12, 8), stone, m(1.8));
};

// ---------------- woods & camping ----------------
/** pine / conifer tree with tiered evergreen needle cones */
export const coniferTree = (b: Batch, x: number, z: number, s = 1, y = 0, seed = 0) => {
  const pineTrunk = lam("kit/pineTrunk", () => ({ color: "#4d3324" }));
  const pine1 = lam("kit/pineDark", () => ({ color: "#1c3c28" }));
  const pine2 = lam("kit/pineMid", () => ({ color: "#254e34" }));
  const pine3 = lam("kit/pineLight", () => ({ color: "#316142" }));
  const sway = 0.05 * Math.sin(seed * 4.7);
  b.add(new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 2.4 * s, 7), pineTrunk,
    new THREE.Matrix4().compose(V(x, y + 1.2 * s, z), new THREE.Quaternion(), V(1, 1, 1)));
  const tiers = [
    { r: 1.65 * s, h: 2.2 * s, dy: 2.2 * s, mat: pine1, rot: seed * 1.5 },
    { r: 1.35 * s, h: 2.0 * s, dy: 3.5 * s, mat: pine2, rot: seed * 2.3 + 0.5 },
    { r: 0.95 * s, h: 1.8 * s, dy: 4.6 * s, mat: pine3, rot: seed * 3.1 + 1.2 },
  ];
  for (const t of tiers) {
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), t.rot);
    const cone = new THREE.ConeGeometry(t.r, t.h, 8);
    b.add(cone, t.mat, new THREE.Matrix4().compose(V(x + sway, y + t.dy, z), q, V(1, 1, 1)));
  }
};

/** mountain granite / mossy boulder */
export const rockBoulder = (b: Batch, x: number, z: number, s = 1, y = 0, seed = 0) => {
  const rock = lam("kit/rock", () => ({ color: "#6c727a" }));
  const g = new THREE.DodecahedronGeometry(1.0 * s, 1);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(seed * 0.7, seed * 1.3, seed * 0.4));
  b.add(g, rock, new THREE.Matrix4().compose(V(x, y + 0.65 * s, z), q, V(1.2, 0.85, 1.1)));
};

/** expedition A-frame camping tent with open front flaps, poles, and sleeping bags */
export const tent = (b: Batch, x: number, z: number, yaw = 0, s = 1, color = "#d35400") => {
  const M = new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(1, 1, 1));
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, local = new THREE.Matrix4()) =>
    b.add(geo, mat, M.clone().multiply(local));

  const canvasMat = lam("kit/tentCanvas:" + color, () => ({ color, side: THREE.DoubleSide }));
  const darkCanvas = lam("kit/tentInner", () => ({ color: "#1a252f", side: THREE.DoubleSide }));
  const floorMat = lam("kit/tentFloor", () => ({ color: "#222a35" }));
  const poleMat = lam("kit/tentPole", () => ({ color: "#7f8c8d" }));
  const sleepingBagA = lam("kit/bedrollA", () => ({ color: "#2980b9" }));
  const sleepingBagB = lam("kit/bedrollB", () => ({ color: "#27ae60" }));
  const lanternMat = lam("kit/tentLantern", () => ({ color: "#ffd27f", emissive: "#ffaa44", emissiveIntensity: 1.2 }));

  const w = 2.4 * s, len = 3.2 * s, h = 1.9 * s;
  const hw = w / 2, hlen = len / 2;

  // Open A-frame roof slopes + back wall
  const roof = new THREE.BufferGeometry();
  const verts = [
    // Left roof slope
    0, h, -hlen,   -hw, 0, -hlen,   0, h, hlen,
    0, h, hlen,    -hw, 0, -hlen,   -hw, 0, hlen,
    // Right roof slope
    0, h, -hlen,   0, h, hlen,      hw, 0, -hlen,
    0, h, hlen,    hw, 0, hlen,     hw, 0, -hlen,
    // Back wall
    0, h, -hlen,   hw, 0, -hlen,    -hw, 0, -hlen,
  ];
  roof.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  roof.computeVertexNormals();
  put(roof, canvasMat);

  // Rolled / pinned front door flaps (accentuate the opening)
  const flapGeo = new THREE.BufferGeometry();
  const flapVerts = [
    0, h, hlen,   -hw, 0, hlen,   -hw * 0.65, 0.45 * h, hlen + 0.15 * s,
    0, h, hlen,   hw * 0.65, 0.45 * h, hlen + 0.15 * s,   hw, 0, hlen,
  ];
  flapGeo.setAttribute("position", new THREE.Float32BufferAttribute(flapVerts, 3));
  flapGeo.computeVertexNormals();
  put(flapGeo, darkCanvas);

  // Tent interior groundsheet
  put(floor(-hw * 0.95, hw * 0.95, -hlen * 0.95, hlen * 0.95, 0.02, 1, 1), floorMat);

  // Sleeping bags inside
  put(boxGeo(V(-hw * 0.75, 0.02, -hlen * 0.7), V(-0.06 * s, 0.22 * s, hlen * 0.6)), sleepingBagA);
  put(boxGeo(V(0.06 * s, 0.02, -hlen * 0.7), V(hw * 0.75, 0.22 * s, hlen * 0.6)), sleepingBagB);

  // Pillows
  const pillowMat = lam("kit/tentPillow", () => ({ color: "#ecf0f1" }));
  put(boxGeo(V(-hw * 0.72, 0.22 * s, -hlen * 0.65), V(-0.08 * s, 0.32 * s, -hlen * 0.3)), pillowMat);
  put(boxGeo(V(0.08 * s, 0.22 * s, -hlen * 0.65), V(hw * 0.72, 0.32 * s, -hlen * 0.3)), pillowMat);

  // Small camping lantern in the corner
  put(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.22 * s, 6), lanternMat, new THREE.Matrix4().makeTranslation(0, 0.12 * s, hlen * 0.5));

  // Front & back A-frame poles
  for (const zOff of [hlen, -hlen]) {
    put(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, h * 1.05, 6), poleMat,
      new THREE.Matrix4().makeTranslation(0, h * 0.5, zOff));
  }

  // Backlit tent door slit & metallic zipper pull mesh
  const zipperMat = lam("kit/tentZipper", () => ({ color: "#bdc3c7", emissive: "#7f8c8d", emissiveIntensity: 0.4 }));
  put(boxGeo(V(-0.025 * s, 0.48 * h, hlen - 0.02 * s), V(0.025 * s, 0.58 * h, hlen + 0.03 * s)), zipperMat);
  put(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.09 * s, 6), zipperMat, new THREE.Matrix4().makeTranslation(0, 0.44 * h, hlen + 0.02 * s));
};

/** campfire: stone ring, stacked firewood logs, glowing fire / embers */
export const campfire = (b: Batch, x: number, z: number, lit = true, s = 1) => {
  const stone = lam("kit/fireStone", () => ({ color: "#5a5e66" }));
  const wood = lam("kit/fireWood", () => ({ color: "#3d2716" }));
  const emberMat = lit
    ? lam("kit/fireFlame", () => ({ color: "#ff4d00", emissive: "#ff9100", emissiveIntensity: 1.8 }))
    : lam("kit/charcoal", () => ({ color: "#222225" }));

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 0.72 * s;
    b.add(new THREE.DodecahedronGeometry(0.18 * s, 0), stone,
      new THREE.Matrix4().makeTranslation(x + Math.cos(a) * r, 0.12 * s, z + Math.sin(a) * r));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + 0.2;
    const log = new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 1.1 * s, 6);
    log.rotateX(Math.PI / 2);
    log.rotateY(a);
    b.add(log, wood, new THREE.Matrix4().makeTranslation(x, 0.14 * s + i * 0.04 * s, z));
  }
  if (lit) {
    const flameCore = new THREE.ConeGeometry(0.35 * s, 0.85 * s, 6);
    b.add(flameCore, emberMat, new THREE.Matrix4().makeTranslation(x, 0.45 * s, z));
    const flameTip = new THREE.ConeGeometry(0.22 * s, 0.65 * s, 5);
    b.add(flameTip, lam("kit/flameYellow", () => ({ color: "#ffea00", emissive: "#ffea00", emissiveIntensity: 2.2 })),
      new THREE.Matrix4().makeTranslation(x, 0.65 * s, z));
  } else {
    b.add(new THREE.CylinderGeometry(0.45 * s, 0.55 * s, 0.08 * s, 8), emberMat,
      new THREE.Matrix4().makeTranslation(x, 0.05 * s, z));
  }
};

// ---------------- water ----------------
export type Water = { mesh: THREE.Mesh; map: THREE.Texture; speed: number };

/** painted river surface: blue base, soft bands and a few warm glints */
const riverTex = () => ctex("kit/river", 512, 512, (g, r) => {
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#2f6f92"); grad.addColorStop(0.45, "#3f86a4"); grad.addColorStop(1, "#2a6486");
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  const tones = ["rgba(150,214,240,.30)", "rgba(24,74,105,.30)", "rgba(205,240,255,.22)", "rgba(18,58,86,.24)"];
  for (let i = 0; i < 150; i++) {
    g.fillStyle = tones[Math.floor(r() * 4)];
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 120, 2 + r() * 5, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = "rgba(255,216,166,.35)"; g.lineWidth = 1 + r() * 2;
    const x = r() * 512, y = r() * 512, w = 20 + r() * 70;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
  }
});

/** a river/lake surface; the texture drifts along its length for cheap motion */
export const water = (w: number, d: number, x: number, z: number, y = -0.55, repeat = 10, speed = 0.035): Water => {
  const map = rep(riverTex(), 1, repeat / 3);
  // unlit: at golden hour the two-tone world shading turned a lit river olive;
  // water should keep its colour and let the grade carry the time of day
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  return { mesh, map, speed };
};

/** advance every water surface on the clock (kept out of React) */
export const updateWater = (waters: Water[], seconds: number) => {
  for (const w of waters) w.map.offset.y = (seconds * w.speed) % 1;
};
