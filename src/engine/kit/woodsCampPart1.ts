import * as THREE from "three";
import {
  LAYER_NOINK,
  LightMood,
  applySceneLighting,
  createPaintedTexture,
  createTwoToneMaterial,
} from "./paintedStyle";

export type Part1SceneMode =
  | "ember_cold_open"
  | "trail_day"
  | "pup_rescue"
  | "camp_dusk_to_night"
  | "tent_wolf_howl"
  | "tent_zipper_cliffhanger";

export interface BuiltScene {
  scene: THREE.Scene;
  update: (frame: number, fps: number) => void;
  dispose: () => void;
}

interface SharedMats {
  grass: THREE.MeshLambertMaterial;
  dirt: THREE.MeshLambertMaterial;
  pineDark: THREE.MeshLambertMaterial;
  pineMid: THREE.MeshLambertMaterial;
  bark: THREE.MeshLambertMaterial;
  rock: THREE.MeshLambertMaterial;
  moss: THREE.MeshLambertMaterial;
  tentCanvas: THREE.MeshLambertMaterial;
  tentTrim: THREE.MeshLambertMaterial;
  bagLeo: THREE.MeshLambertMaterial;
  bagSam: THREE.MeshLambertMaterial;
  redRope: THREE.MeshLambertMaterial;
  charcoal: THREE.MeshLambertMaterial;
  brass: THREE.MeshLambertMaterial;
}

function createSharedMaterials(): SharedMats {
  const grassTex = createPaintedTexture(
    "#424d32",
    ["#4f5e3b", "#374229", "#5c6a43"],
    101,
    [10, 10]
  );
  const dirtTex = createPaintedTexture(
    "#7a5c3e",
    ["#8c6b4a", "#654a30", "#997754"],
    202,
    [2, 12]
  );
  const pineTex = createPaintedTexture(
    "#254436",
    ["#2f5745", "#1b3328", "#396650"],
    303,
    [2, 2]
  );
  const barkTex = createPaintedTexture(
    "#4d3426",
    ["#5e4030", "#3a251b", "#6b4a36"],
    404,
    [1, 3]
  );
  const rockTex = createPaintedTexture(
    "#636a70",
    ["#747c84", "#4f555b", "#828a91"],
    505,
    [2, 2]
  );
  const tentTex = createPaintedTexture(
    "#d4933b",
    ["#e0a34c", "#bf7f2a", "#c98934"],
    606,
    [2, 2]
  );

  return {
    grass: createTwoToneMaterial({ map: grassTex }),
    dirt: createTwoToneMaterial({ map: dirtTex }),
    pineDark: createTwoToneMaterial({ map: pineTex, color: "#c9dfd4" }),
    pineMid: createTwoToneMaterial({ map: pineTex, color: "#e5f2ea" }),
    bark: createTwoToneMaterial({ map: barkTex }),
    rock: createTwoToneMaterial({ map: rockTex }),
    moss: createTwoToneMaterial({ color: "#58703b" }),
    tentCanvas: createTwoToneMaterial({
      map: tentTex,
      side: THREE.DoubleSide, // Crucial for cutaway/open tent interior
    }),
    tentTrim: createTwoToneMaterial({
      color: "#2b4a3e",
      side: THREE.DoubleSide,
    }),
    bagLeo: createTwoToneMaterial({ color: "#2d5d8c" }),
    bagSam: createTwoToneMaterial({ color: "#c95b36" }),
    redRope: createTwoToneMaterial({ color: "#d62d20" }),
    charcoal: createTwoToneMaterial({ color: "#252328" }),
    brass: createTwoToneMaterial({ color: "#e5b84b" }),
  };
}

// ---------------------------------------------------------------------------
// REUSABLE PAINTED 3D PREFABS
// ---------------------------------------------------------------------------

function buildConiferTree(
  mats: SharedMats,
  heightScale = 1,
  variant = 0
): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.26, 1.8 * heightScale, 7),
    mats.bark
  );
  trunk.position.y = 0.9 * heightScale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  const tierMat = variant % 2 === 0 ? mats.pineDark : mats.pineMid;
  const tiers = [
    { r: 1.35, h: 2.0, y: 2.1 },
    { r: 1.05, h: 1.8, y: 3.3 },
    { r: 0.72, h: 1.5, y: 4.35 },
  ];
  for (const t of tiers) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(t.r * heightScale, t.h * heightScale, 7),
      tierMat
    );
    cone.position.y = t.y * heightScale;
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);
  }
  return g;
}

function buildRockBoulder(
  mats: SharedMats,
  scale: [number, number, number] = [1, 0.7, 0.9],
  withMoss = true
): THREE.Group {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), mats.rock);
  rock.scale.set(...scale);
  rock.position.y = 0.35 * scale[1];
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);

  if (withMoss) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.48),
      mats.moss
    );
    cap.scale.set(scale[0] * 0.95, scale[1] * 0.6, scale[2] * 0.92);
    cap.position.y = 0.48 * scale[1];
    g.add(cap);
  }
  return g;
}

/**
 * Open A-frame tent with rolled front flaps (never a closed opaque prism),
 * DoubleSide canvas walls, interior lantern light, optional flat empty Sam bag,
 * and animated brass zipper slider on the front right flap.
 */
function buildOpenTent(
  mats: SharedMats,
  options: {
    interiorLantern: boolean;
    samBagEmpty?: boolean;
    withZipperPull?: boolean;
  }
): {
  group: THREE.Group;
  zipperPull: THREE.Mesh | null;
  lanternLight: THREE.PointLight | null;
} {
  const g = new THREE.Group();
  const width = 2.1;
  const height = 1.65;
  const depth = 2.4;

  // Floor mat
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.08, depth),
    mats.tentTrim
  );
  floor.position.y = 0.04;
  floor.receiveShadow = true;
  g.add(floor);

  // Two sloped roof/side panels (open at front Z = +depth/2)
  const slopeLen = Math.hypot(width / 2, height);
  const slopeAngle = Math.atan2(width / 2, height);

  const leftPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(slopeLen, depth),
    mats.tentCanvas
  );
  leftPanel.rotation.order = "YXZ";
  leftPanel.rotation.y = Math.PI / 2;
  leftPanel.rotation.x = slopeAngle;
  leftPanel.position.set(-width / 4, height / 2, 0);
  leftPanel.castShadow = true;
  leftPanel.receiveShadow = true;

  const rightPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(slopeLen, depth),
    mats.tentCanvas
  );
  rightPanel.rotation.order = "YXZ";
  rightPanel.rotation.y = -Math.PI / 2;
  rightPanel.rotation.x = slopeAngle;
  rightPanel.position.set(width / 4, height / 2, 0);
  rightPanel.castShadow = true;
  rightPanel.receiveShadow = true;

  // Back triangular wall (Z = -depth/2)
  const backShape = new THREE.Shape();
  backShape.moveTo(-width / 2, 0);
  backShape.lineTo(width / 2, 0);
  backShape.lineTo(0, height);
  backShape.closePath();
  const backWall = new THREE.Mesh(
    new THREE.ShapeGeometry(backShape),
    mats.tentCanvas
  );
  backWall.position.set(0, 0.06, -depth / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;

  // Rolled open front entrance flaps (left & right edges)
  const flapGeo = new THREE.CylinderGeometry(0.1, 0.12, slopeLen * 0.92, 8);
  const leftFlap = new THREE.Mesh(flapGeo, mats.tentTrim);
  leftFlap.position.set(-width / 4 - 0.14, height / 2, depth / 2);
  leftFlap.rotation.z = -slopeAngle;

  const rightFlap = new THREE.Mesh(flapGeo, mats.tentTrim);
  rightFlap.position.set(width / 4 + 0.14, height / 2, depth / 2);
  rightFlap.rotation.z = slopeAngle;

  // Ridge pole
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, depth + 0.2, 6),
    mats.bark
  );
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(0, height + 0.03, 0);

  g.add(leftPanel, rightPanel, backWall, leftFlap, rightFlap, ridge);

  // Sleeping bags inside tent (Sam on left X = -0.42, Leo on right X = +0.42)
  const leoBag = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.18, 1.55),
    mats.bagLeo
  );
  leoBag.position.set(0.42, 0.14, -0.08);
  leoBag.receiveShadow = true;
  g.add(leoBag);

  const samBag = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.64,
      options.samBagEmpty ? 0.05 : 0.18, // Flattened when Sam is missing in Shot 6
      1.55
    ),
    mats.bagSam
  );
  samBag.position.set(-0.42, options.samBagEmpty ? 0.09 : 0.14, -0.08);
  samBag.receiveShadow = true;
  g.add(samBag);

  // Animated 3D brass zipper slider along the front opening (Shot 6)
  let zipperPull: THREE.Mesh | null = null;
  if (options.withZipperPull) {
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, height * 0.85, 0.025),
      mats.charcoal
    );
    track.position.set(0.06, height * 0.45, depth / 2 + 0.02);
    g.add(track);

    zipperPull = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.14, 0.05),
      mats.brass
    );
    zipperPull.position.set(0.06, height * 0.78, depth / 2 + 0.04);
    g.add(zipperPull);
  }

  // Warm interior lantern fill so characters & bedrolls read cleanly at night
  let lanternLight: THREE.PointLight | null = null;
  if (options.interiorLantern) {
    lanternLight = new THREE.PointLight("#ffb050", 1.15, 4.8, 1.6);
    lanternLight.position.set(0, height - 0.35, 0.15);
    g.add(lanternLight);

    const lanternBulb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.14, 8),
      new THREE.MeshBasicMaterial({ color: "#ffd98a" })
    );
    lanternBulb.position.copy(lanternLight.position);
    lanternBulb.layers.set(LAYER_NOINK);
    g.add(lanternBulb);
  }

  return { group: g, zipperPull, lanternLight };
}

/**
 * Campfire prefab supporting three states:
 * - "lit": flickering 2-layer cartoon flame + rising embers + warm PointLight
 * - "dying": single fading orange ember + curling ink smoke puff
 * - "dead": cold charcoal ring
 */
function buildCampfire(
  mats: SharedMats,
  state: "lit" | "dying" | "dead"
): {
  group: THREE.Group;
  updateFire: (t: number, fadeFactor?: number) => void;
} {
  const g = new THREE.Group();

  // Stone fire ring
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.16, 0),
      mats.rock
    );
    stone.position.set(Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62);
    stone.scale.set(1.1, 0.65, 0.9);
    stone.castShadow = true;
    stone.receiveShadow = true;
    g.add(stone);
  }

  // Charred logs
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.95, 6),
      mats.charcoal
    );
    log.rotation.z = Math.PI / 2 - 0.18;
    log.rotation.y = (i * Math.PI) / 3;
    log.position.y = 0.14;
    g.add(log);
  }

  let fireLight: THREE.PointLight | null = null;
  let flameOuter: THREE.Mesh | null = null;
  let flameInner: THREE.Mesh | null = null;
  const embers: THREE.Mesh[] = [];
  const smokePuffs: THREE.Mesh[] = [];

  if (state === "lit") {
    fireLight = new THREE.PointLight("#ff7c2b", 3.2, 11, 1.5);
    fireLight.position.set(0, 0.75, 0);
    g.add(fireLight);

    flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.85, 6),
      new THREE.MeshBasicMaterial({ color: "#ff6d1f" })
    );
    flameOuter.position.y = 0.48;
    flameOuter.layers.set(LAYER_NOINK);

    flameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: "#ffe066" })
    );
    flameInner.position.y = 0.36;
    flameInner.layers.set(LAYER_NOINK);
    g.add(flameOuter, flameInner);

    for (let i = 0; i < 10; i++) {
      const e = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: "#ffae33" })
      );
      e.layers.set(LAYER_NOINK);
      g.add(e);
      embers.push(e);
    }
  } else if (state === "dying") {
    fireLight = new THREE.PointLight("#ff5a14", 1.8, 5.5, 1.8);
    fireLight.position.set(0, 0.35, 0);
    g.add(fireLight);

    flameInner = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: "#ff5a14" })
    );
    flameInner.position.set(0.04, 0.14, 0.06);
    flameInner.layers.set(LAYER_NOINK);
    g.add(flameInner);

    // Stylized rising smoke puffs
    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + i * 0.025, 8, 8),
        new THREE.MeshBasicMaterial({
          color: "#9aa7c2",
          transparent: true,
          opacity: 0.42,
        })
      );
      puff.layers.set(LAYER_NOINK);
      g.add(puff);
      smokePuffs.push(puff);
    }
  }

  const updateFire = (t: number, fadeFactor = 1) => {
    if (fireLight && state === "lit") {
      const flicker = 0.85 + Math.sin(t * 17) * 0.1 + Math.cos(t * 29) * 0.07;
      fireLight.intensity = 3.2 * flicker * fadeFactor;
    }
    if (flameOuter && flameInner && state === "lit") {
      const s = (0.9 + Math.sin(t * 15) * 0.14) * fadeFactor;
      flameOuter.scale.set(Math.max(0.01, s), Math.max(0.01, s * 1.08), Math.max(0.01, s));
      flameInner.scale.setScalar(Math.max(0.01, s * 0.95));
      flameOuter.visible = fadeFactor > 0.05;
      flameInner.visible = fadeFactor > 0.05;
    }
    embers.forEach((e, i) => {
      const cycle = (t * 0.55 + i * 0.13) % 1;
      e.position.set(
        Math.sin(t * 2 + i * 1.7) * 0.25,
        0.35 + cycle * 2.1,
        Math.cos(t * 1.8 + i * 2.1) * 0.25
      );
      e.scale.setScalar((1 - cycle) * fadeFactor);
    });
    if (state === "dying") {
      const glow = Math.max(0, 1 - t * 0.34); // Dies cleanly over ~3s
      if (fireLight) fireLight.intensity = 1.8 * glow * (0.85 + Math.sin(t * 22) * 0.15);
      if (flameInner) flameInner.scale.setScalar(0.35 + glow * 0.7);
      smokePuffs.forEach((p, i) => {
        const cycle = (t * 0.32 + i / smokePuffs.length) % 1;
        p.position.set(
          Math.sin(cycle * 5 + i) * 0.18,
          0.25 + cycle * 1.8,
          Math.cos(cycle * 4 + i) * 0.12
        );
        p.scale.setScalar(0.6 + cycle * 1.2);
        (p.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.45;
      });
    }
  };

  return { group: g, updateFire };
}

/** Drifting cartoon cloud bank on LAYER_NOINK for living daylight sky */
function buildCloudField(): {
  group: THREE.Group;
  updateClouds: (t: number) => void;
} {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: "#f6f9ff", fog: false });
  const clouds: THREE.Group[] = [];

  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    const puffs = [
      [0, 0, 0, 1.8],
      [-1.4, -0.2, 0.2, 1.3],
      [1.5, -0.15, -0.1, 1.4],
    ];
    for (const [x, y, z, r] of puffs) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
      m.position.set(x, y, z);
      m.scale.set(1.2, 0.65, 0.8);
      m.layers.set(LAYER_NOINK);
      c.add(m);
    }
    c.position.set(-18 + i * 7.5, 13 + (i % 3) * 1.8, -26 - (i % 2) * 8);
    g.add(c);
    clouds.push(c);
  }

  return {
    group: g,
    updateClouds: (t: number) => {
      clouds.forEach((c, i) => {
        c.position.x = (((-18 + i * 7.5 + t * 0.45) + 25) % 50) - 25;
      });
    },
  };
}

/** Shared base terrain + perimeter pine forest */
function addForestClearing(
  scene: THREE.Scene,
  mats: SharedMats,
  options: { withTrail?: boolean }
): THREE.Group[] {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), mats.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  if (options.withTrail) {
    // High-contrast packed dirt trail (#7a5c3e) winding along Z
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 36), mats.dirt);
    trail.rotation.x = -Math.PI / 2;
    trail.position.set(0, 0.015, 6);
    trail.receiveShadow = true;
    scene.add(trail);
  }

  // Conifer perimeter keeping central 9:16 sightline unobstructed
  const treeCoords: [number, number, number][] = [
    [-3.6, 12.5, 1.1], [3.5, 11.8, 1.0],
    [-3.2, 7.5, 1.25], [3.3, 6.8, 1.15],
    [-3.8, 2.4, 1.2], [3.6, 2.0, 1.05],
    [-4.2, -2.5, 1.3], [4.1, -2.8, 1.2],
    [-2.4, -6.2, 1.35], [0.2, -7.0, 1.4], [2.6, -6.0, 1.3],
    [-5.5, -5.0, 1.15], [5.4, -5.2, 1.25],
  ];

  const trees: THREE.Group[] = [];
  treeCoords.forEach(([x, z, s], idx) => {
    const tree = buildConiferTree(mats, s, idx);
    tree.position.set(x, 0, z);
    scene.add(tree);
    trees.push(tree);
  });

  return trees;
}

// ---------------------------------------------------------------------------
// MASTER BUILDER FOR ALL 6 PART 1 SCENES
// ---------------------------------------------------------------------------

export function buildPart1Scene(mode: Part1SceneMode): BuiltScene {
  const scene = new THREE.Scene();
  const mats = createSharedMaterials();
  const updaters: Array<(t: number, frame: number) => void> = [];

  const moodByMode: Record<Part1SceneMode, LightMood> = {
    ember_cold_open: "night",
    trail_day: "day",
    pup_rescue: "day",
    camp_dusk_to_night: "golden",
    tent_wolf_howl: "night",
    tent_zipper_cliffhanger: "night",
  };

  const { keyLight, hemiLight } = applySceneLighting(scene, moodByMode[mode]);
  const trees = addForestClearing(scene, mats, {
    withTrail: mode === "trail_day" || mode === "pup_rescue",
  });

  // Gentle wind sway on all conifer trees (environment life)
  updaters.push((t) => {
    trees.forEach((tr, i) => {
      tr.rotation.z = Math.sin(t * 1.4 + i * 0.9) * 0.022;
    });
  });

  // --- SCENE 1: COLD OPEN DYING EMBER (Frames 0-105) ---
  if (mode === "ember_cold_open") {
    const { group: tent } = buildOpenTent(mats, { interiorLantern: false });
    tent.position.set(0, 0, -2.4);
    scene.add(tent);

    const { group: fire, updateFire } = buildCampfire(mats, "dying");
    fire.position.set(0, 0, 1.25);
    scene.add(fire);
    updaters.push((t) => updateFire(t));
  }

  // --- SCENE 2: DAYLIGHT TRAIL HIKE (Frames 105-300) ---
  if (mode === "trail_day") {
    const { group: clouds, updateClouds } = buildCloudField();
    scene.add(clouds);
    updaters.push((t) => updateClouds(t));

    // Trailside mossy rocks for parallax depth
    const r1 = buildRockBoulder(mats, [0.9, 0.55, 0.75], true);
    r1.position.set(-1.9, 0, 12.8);
    const r2 = buildRockBoulder(mats, [0.75, 0.45, 0.7], true);
    r2.position.set(1.85, 0, 9.5);
    scene.add(r1, r2);
  }

  // --- SCENE 3: MILE-6 WOLF PUP RESCUE (Frames 300-495) ---
  if (mode === "pup_rescue") {
    const { group: clouds, updateClouds } = buildCloudField();
    scene.add(clouds);
    updaters.push((t) => updateClouds(t));

    // Hero mossy boulder + twisted tree root snare (Z = +0.75)
    const boulder = buildRockBoulder(mats, [1.15, 0.75, 0.9], true);
    boulder.position.set(0.75, 0, 0.45);
    scene.add(boulder);

    const root = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.12, 7, 14, Math.PI * 0.85),
      mats.bark
    );
    root.position.set(0.15, 0.08, 0.95);
    root.rotation.set(0.35, 0.4, 0.2);
    root.castShadow = true;
    scene.add(root);

    // Bright red snare rope (snaps cleanly at local frame 105 / global F:405)
    const ropeLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.032, 6, 12),
      mats.redRope
    );
    ropeLoop.position.set(0.18, 0.16, 1.22);
    ropeLoop.rotation.x = Math.PI / 2;
    scene.add(ropeLoop);

    updaters.push((_t, frame) => {
      const freed = frame >= 405;
      ropeLoop.position.y = freed ? 0.035 : 0.16;
      ropeLoop.scale.set(freed ? 1.35 : 1.0, freed ? 0.45 : 1.0, 1.0);
    });
  }

  // --- SCENE 4: DUSK CAMP TO DYING NIGHT FIRE (Frames 495-735) ---
  if (mode === "camp_dusk_to_night") {
    const { group: tent } = buildOpenTent(mats, { interiorLantern: true });
    tent.position.set(0, 0, -2.2);
    scene.add(tent);

    const { group: fire, updateFire } = buildCampfire(mats, "lit");
    fire.position.set(0, 0, 1.3);
    scene.add(fire);

    // Sitting logs flanking campfire within 9:16 safe X range (|X| <= 1.2m)
    const leftLog = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 1.05, 7),
      mats.bark
    );
    leftLog.rotation.x = Math.PI / 2;
    leftLog.rotation.z = 0.22;
    leftLog.position.set(-1.12, 0.18, 1.25);
    leftLog.castShadow = true;

    const rightLog = leftLog.clone();
    rightLog.rotation.z = -0.22;
    rightLog.position.set(1.12, 0.18, 1.25);
    scene.add(leftLog, rightLog);

    const goldenColor = new THREE.Color("#ffab5e");
    const nightColor = new THREE.Color("#b5d0ff");
    const goldenFog = new THREE.Color("#c9967a");
    const nightFog = new THREE.Color("#111b33");

    // Smooth dusk -> indigo night transition + campfire dying out across F:495..735
    updaters.push((t, frame) => {
      const progress = THREE.MathUtils.clamp((frame - 495) / 215, 0, 1);
      keyLight.color.lerpColors(goldenColor, nightColor, progress);
      keyLight.intensity = THREE.MathUtils.lerp(1.35, 0.85, progress);
      hemiLight.intensity = THREE.MathUtils.lerp(0.58, 0.45, progress);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerpColors(goldenFog, nightFog, progress);
      }
      const fireFade = THREE.MathUtils.clamp(1 - (progress - 0.55) / 0.45, 0, 1);
      updateFire(t, fireFade);
    });
  }

  // --- SCENE 5: 2:14 AM WOLF HOWL WAKE-UP (Frames 735-975) ---
  if (mode === "tent_wolf_howl") {
    const { group: tent } = buildOpenTent(mats, {
      interiorLantern: true,
      samBagEmpty: true,
    });
    tent.position.set(0, 0, -1.2);
    scene.add(tent);

    const { group: deadFire } = buildCampfire(mats, "dead");
    deadFire.position.set(0, 0, 1.85);
    scene.add(deadFire);
  }

  // --- SCENE 6: EMPTY BAG & ANIMATED TENT ZIPPER CLIFFHANGER (Frames 975-1170) ---
  if (mode === "tent_zipper_cliffhanger") {
    const { group: tent, zipperPull } = buildOpenTent(mats, {
      interiorLantern: true,
      samBagEmpty: true,
      withZipperPull: true,
    });
    tent.position.set(0, 0, -1.2);
    scene.add(tent);

    // Subtle indigo cold mist drifting into the open tent mouth
    const mistPuffs: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 8),
        new THREE.MeshBasicMaterial({
          color: "#5f85d4",
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        })
      );
      m.layers.set(LAYER_NOINK);
      m.position.set(-0.4 + i * 0.18, 0.25, 0.25);
      scene.add(m);
      mistPuffs.push(m);
    }

    updaters.push((t, frame) => {
      // Zipper slides steadily downward starting at word "zipper" (F:1104 -> F:1165)
      if (zipperPull) {
        const zipP = THREE.MathUtils.clamp((frame - 1104) / 60, 0, 1);
        zipperPull.position.y = THREE.MathUtils.lerp(1.28, 0.34, zipP);
        zipperPull.rotation.z = Math.sin(frame * 1.8) * 0.08 * (zipP > 0 && zipP < 1 ? 1 : 0);
      }
      mistPuffs.forEach((m, i) => {
        m.position.z = 0.25 - ((t * 0.22 + i * 0.18) % 0.9);
        m.position.y = 0.22 + Math.sin(t + i) * 0.06;
      });
    });
  }

  return {
    scene,
    update: (frame: number, fps: number) => {
      const t = frame / fps;
      for (const fn of updaters) fn(t, frame);
    },
    dispose: () => {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    },
  };
}
