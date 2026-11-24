import * as THREE from "three";
import { getSteelTexture, getMacroRivetTexture, getTramBodyTexture, getDeckTexture } from "./textures";

export function createHowrahMaterials() {
  const steelTex = getSteelTexture("#4d5868", true, true);
  steelTex.repeat.set(2, 2);

  const steelMat = new THREE.MeshLambertMaterial({
    map: steelTex,
    color: 0x68788e,
  });

  const darkSteelMat = new THREE.MeshLambertMaterial({
    color: 0x222a36,
  });

  const rivetMacroTex = getMacroRivetTexture();
  const rivetMacroMat = new THREE.MeshLambertMaterial({
    map: rivetMacroTex,
    color: 0x8898aa,
  });

  const tramBodyTex = getTramBodyTexture();
  const tramBodyMat = new THREE.MeshLambertMaterial({
    map: tramBodyTex,
  });

  const deckTex = getDeckTexture();
  deckTex.repeat.set(1, 12);
  const deckMat = new THREE.MeshLambertMaterial({
    map: deckTex,
  });

  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x1b2830,
    transparent: true,
    opacity: 0.92,
  });

  const concreteMat = new THREE.MeshLambertMaterial({
    color: 0x7a776e,
  });

  return {
    steelMat,
    darkSteelMat,
    rivetMacroMat,
    tramBodyMat,
    deckMat,
    waterMat,
    concreteMat,
  };
}

/**
 * Creates a truss bar between two points in 3D.
 */
export function createTrussBar(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  thickness: number,
  material: THREE.Material
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const geo = new THREE.BoxGeometry(thickness, len, thickness);
  const mesh = new THREE.Mesh(geo, material);

  mesh.position.addVectors(p1, p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates one colossal Howrah cantilever tower / portal pylon (82m scaled).
 */
export function createHowrahTower(
  height = 40,
  width = 16,
  depth = 8,
  steelMat: THREE.Material
): THREE.Group {
  const tower = new THREE.Group();

  // Two massive vertical battered steel legs
  const legThickness = 1.6;
  const legL1 = new THREE.Vector3(-width / 2, 0, -depth / 2);
  const legL2 = new THREE.Vector3(-width / 2 + 1.2, height, -depth / 2 + 0.8);
  const legR1 = new THREE.Vector3(width / 2, 0, -depth / 2);
  const legR2 = new THREE.Vector3(width / 2 - 1.2, height, -depth / 2 + 0.8);

  const legL1_b = new THREE.Vector3(-width / 2, 0, depth / 2);
  const legL2_b = new THREE.Vector3(-width / 2 + 1.2, height, depth / 2 - 0.8);
  const legR1_b = new THREE.Vector3(width / 2, 0, depth / 2);
  const legR2_b = new THREE.Vector3(width / 2 - 1.2, height, depth / 2 - 0.8);

  tower.add(createTrussBar(legL1, legL2, legThickness, steelMat));
  tower.add(createTrussBar(legR1, legR2, legThickness, steelMat));
  tower.add(createTrussBar(legL1_b, legL2_b, legThickness, steelMat));
  tower.add(createTrussBar(legR1_b, legR2_b, legThickness, steelMat));

  // Cross horizontal portals and X-bracing panels
  const levels = 5;
  for (let i = 1; i <= levels; i++) {
    const frac0 = (i - 1) / levels;
    const frac1 = i / levels;

    const y0 = frac0 * height;
    const y1 = frac1 * height;

    const w0 = width - frac0 * 2.4;
    const w1 = width - frac1 * 2.4;
    const d0 = depth - frac0 * 1.6;
    const d1 = depth - frac1 * 1.6;

    // Horizontals at y1
    const pA = new THREE.Vector3(-w1 / 2, y1, -d1 / 2);
    const pB = new THREE.Vector3(w1 / 2, y1, -d1 / 2);
    const pC = new THREE.Vector3(w1 / 2, y1, d1 / 2);
    const pD = new THREE.Vector3(-w1 / 2, y1, d1 / 2);

    tower.add(createTrussBar(pA, pB, 1.0, steelMat));
    tower.add(createTrussBar(pC, pD, 1.0, steelMat));
    tower.add(createTrussBar(pB, pC, 0.8, steelMat));
    tower.add(createTrussBar(pD, pA, 0.8, steelMat));

    // Diagonal X-bracing on front and back
    const pA0 = new THREE.Vector3(-w0 / 2, y0, -d0 / 2);
    const pB0 = new THREE.Vector3(w0 / 2, y0, -d0 / 2);
    tower.add(createTrussBar(pA0, pB, 0.7, steelMat));
    tower.add(createTrussBar(pB0, pA, 0.7, steelMat));

    const pD0 = new THREE.Vector3(-w0 / 2, y0, d0 / 2);
    const pC0 = new THREE.Vector3(w0 / 2, y0, d0 / 2);
    tower.add(createTrussBar(pD0, pC, 0.7, steelMat));
    tower.add(createTrussBar(pC0, pD, 0.7, steelMat));
  }

  // Heavy steel portal crown
  const crownGeo = new THREE.BoxGeometry(width - 2.0, 1.8, depth - 1.2);
  const crown = new THREE.Mesh(crownGeo, steelMat);
  crown.position.set(0, height + 0.9, 0);
  tower.add(crown);

  return tower;
}

/**
 * Creates the complete Howrah Cantilever superstructure across the river.
 */
export function createHowrahBridgeFull(
  steelMat: THREE.Material,
  deckMat: THREE.Material,
  concreteMat: THREE.Material
): THREE.Group {
  const bridge = new THREE.Group();

  const SPAN_HALF = 60; // 120m visual river span
  const DECK_Y = 7.0; // clearance above riverbed
  const TOWER_H = 34; // tower height above deck
  const ROAD_W = 12;

  // Massive concrete bank anchorages on both sides
  const anchorGeo = new THREE.BoxGeometry(22, 14, 28);
  const anchorWest = new THREE.Mesh(anchorGeo, concreteMat);
  anchorWest.position.set(-SPAN_HALF - 24, 4, 0);
  anchorWest.castShadow = true;
  anchorWest.receiveShadow = true;
  bridge.add(anchorWest);

  const anchorEast = anchorWest.clone();
  anchorEast.position.x = SPAN_HALF + 24;
  bridge.add(anchorEast);

  // Twin massive Cantilever Pylons at bank edges (zero in water!)
  const towerWest = createHowrahTower(TOWER_H, ROAD_W + 4, 9, steelMat);
  towerWest.position.set(-SPAN_HALF, DECK_Y, 0);
  bridge.add(towerWest);

  const towerEast = createHowrahTower(TOWER_H, ROAD_W + 4, 9, steelMat);
  towerEast.position.set(SPAN_HALF, DECK_Y, 0);
  bridge.add(towerEast);

  // Suspended road deck spanning bank to bank (120m + anchor arms)
  const totalDeckLen = SPAN_HALF * 2 + 60;
  const deckMesh = new THREE.Mesh(
    new THREE.BoxGeometry(totalDeckLen, 1.2, ROAD_W),
    deckMat
  );
  deckMesh.position.set(0, DECK_Y, 0);
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  bridge.add(deckMesh);

  // Cantilever upper chords tapering down toward the center
  const panels = 10;
  for (const side of [-1, 1]) {
    // Upper chord points: from tower apex down to suspended span pin
    const apex = new THREE.Vector3(side * SPAN_HALF, DECK_Y + TOWER_H, 0);
    const anchorPin = new THREE.Vector3(side * (SPAN_HALF + 28), DECK_Y + 4, 0);
    const tipPin = new THREE.Vector3(side * (SPAN_HALF - 32), DECK_Y + 12, 0);

    // Anchor arm upper chord
    bridge.add(createTrussBar(apex, anchorPin, 1.3, steelMat));

    // Cantilever arm upper chord
    bridge.add(createTrussBar(apex, tipPin, 1.3, steelMat));

    // Vertical hanger cords from upper chord to deck
    for (let p = 1; p < panels; p++) {
      const u = p / panels;
      const xCanti = side * (SPAN_HALF - u * 32);
      const yCanti = DECK_Y + TOWER_H * (1 - u * 0.65);
      bridge.add(
        createTrussBar(
          new THREE.Vector3(xCanti, yCanti, -ROAD_W / 2 + 0.5),
          new THREE.Vector3(xCanti, DECK_Y + 0.6, -ROAD_W / 2 + 0.5),
          0.35,
          steelMat
        )
      );
      bridge.add(
        createTrussBar(
          new THREE.Vector3(xCanti, yCanti, ROAD_W / 2 - 0.5),
          new THREE.Vector3(xCanti, DECK_Y + 0.6, ROAD_W / 2 - 0.5),
          0.35,
          steelMat
        )
      );
    }
  }

  // Suspended central span (resting on cantilever tips, zero piers below!)
  const centerUpperL = new THREE.Vector3(-28, DECK_Y + 12, -ROAD_W / 2 + 0.5);
  const centerUpperR = new THREE.Vector3(28, DECK_Y + 12, -ROAD_W / 2 + 0.5);
  bridge.add(createTrussBar(centerUpperL, centerUpperR, 1.1, steelMat));

  const centerUpperL_b = new THREE.Vector3(-28, DECK_Y + 12, ROAD_W / 2 - 0.5);
  const centerUpperR_b = new THREE.Vector3(28, DECK_Y + 12, ROAD_W / 2 - 0.5);
  bridge.add(createTrussBar(centerUpperL_b, centerUpperR_b, 1.1, steelMat));

  // Suspended span cross ties
  for (let x = -24; x <= 24; x += 8) {
    bridge.add(
      createTrussBar(
        new THREE.Vector3(x, DECK_Y + 12, -ROAD_W / 2 + 0.5),
        new THREE.Vector3(x, DECK_Y + 0.6, -ROAD_W / 2 + 0.5),
        0.3,
        steelMat
      )
    );
    bridge.add(
      createTrussBar(
        new THREE.Vector3(x, DECK_Y + 12, ROAD_W / 2 - 0.5),
        new THREE.Vector3(x, DECK_Y + 0.6, ROAD_W / 2 - 0.5),
        0.3,
        steelMat
      )
    );
  }

  // Deck guard railings
  const railGeo = new THREE.BoxGeometry(totalDeckLen, 1.2, 0.25);
  const railL = new THREE.Mesh(railGeo, steelMat);
  railL.position.set(0, DECK_Y + 1.2, -ROAD_W / 2 + 0.2);
  const railR = railL.clone();
  railR.position.z = ROAD_W / 2 - 0.2;
  bridge.add(railL, railR);

  return bridge;
}

/**
 * Creates a detailed 1940s Kolkata Tramcar.
 */
export function createKolkataTram(
  tramBodyMat: THREE.Material,
  steelMat: THREE.Material
): THREE.Group {
  const tram = new THREE.Group();

  const TRAM_L = 9.8;
  const TRAM_W = 2.4;
  const TRAM_H = 3.2;

  // Main wooden & steel coach body
  const bodyGeo = new THREE.BoxGeometry(TRAM_L, TRAM_H, TRAM_W);
  const body = new THREE.Mesh(bodyGeo, tramBodyMat);
  body.position.set(0, TRAM_H / 2 + 0.7, 0);
  body.castShadow = true;
  tram.add(body);

  // Rounded aerodynamic front & back vestibules
  const capGeo = new THREE.CylinderGeometry(TRAM_W / 2, TRAM_W / 2, TRAM_H, 12, 1, false, 0, Math.PI);
  const capFront = new THREE.Mesh(capGeo, tramBodyMat);
  capFront.rotation.y = Math.PI / 2;
  capFront.position.set(TRAM_L / 2, TRAM_H / 2 + 0.7, 0);
  tram.add(capFront);

  const capRear = capFront.clone();
  capRear.rotation.y = -Math.PI / 2;
  capRear.position.x = -TRAM_L / 2;
  tram.add(capRear);

  // Curved dark clerestory roof
  const roofGeo = new THREE.BoxGeometry(TRAM_L + 1.2, 0.45, TRAM_W + 0.2);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x332822 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, TRAM_H + 0.95, 0);
  roof.castShadow = true;
  tram.add(roof);

  // Trolley pole reaching up to catenary
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x8892a0 });
  const pole = createTrussBar(
    new THREE.Vector3(0, TRAM_H + 1.1, 0),
    new THREE.Vector3(-2.8, TRAM_H + 3.1, 0),
    0.08,
    poleMat
  );
  tram.add(pole);

  // Trolley wheel spark / glow contact
  const sparkGeo = new THREE.SphereGeometry(0.16, 8, 8);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc });
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.set(-2.8, TRAM_H + 3.1, 0);
  tram.add(spark);

  // Warm glowing interior windows & cabin light
  const winGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd978 });
  for (let zSide of [-TRAM_W / 2 - 0.02, TRAM_W / 2 + 0.02]) {
    for (let i = 0; i < 5; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.85), winGlowMat);
      win.position.set(-2.6 + i * 1.3, 2.1, zSide);
      if (zSide < 0) win.rotation.y = Math.PI;
      tram.add(win);
    }
  }

  const cabinLight = new THREE.PointLight(0xffba55, 3.0, 16);
  cabinLight.position.set(0, 2.2, 0);
  tram.add(cabinLight);

  // Blackout wartime hooded headlight on front
  const lightHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.45, 12),
    new THREE.MeshLambertMaterial({ color: 0x1f2328 })
  );
  lightHousing.rotation.z = Math.PI / 2;
  lightHousing.position.set(TRAM_L / 2 + 1.2, 1.8, 0);
  tram.add(lightHousing);

  // Forward beam spotlight illuminating the tracks ahead
  const headSpot = new THREE.SpotLight(0xfff0b3, 5.0, 36, Math.PI / 4, 0.35);
  headSpot.position.set(TRAM_L / 2 + 1.2, 1.8, 0);
  headSpot.target.position.set(TRAM_L / 2 + 16, 0.5, 0);
  tram.add(headSpot, headSpot.target);

  // Dim amber slit beam on front housing
  const lightSlit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide })
  );
  lightSlit.rotation.y = Math.PI / 2;
  lightSlit.position.set(TRAM_L / 2 + 1.45, 1.8, 0);
  tram.add(lightSlit);

  // Dual wheel bogies
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x22262d });
  for (const bx of [-TRAM_L * 0.28, TRAM_L * 0.28]) {
    for (const bz of [-TRAM_W * 0.45, TRAM_W * 0.45]) {
      for (const wx of [-0.75, 0.75]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.16, 16), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(bx + wx, 0.38, bz);
        wheel.castShadow = true;
        tram.add(wheel);
      }
    }
  }

  return tram;
}

/**
 * Creates WWII searchlight beam scanning the night sky.
 */
export function createSearchlightBeam(
  height = 90,
  baseRadius = 0.5,
  topRadius = 14
): THREE.Group {
  const group = new THREE.Group();

  const beamGeo = new THREE.CylinderGeometry(topRadius, baseRadius, height, 24, 1, true);
  beamGeo.translate(0, height / 2, 0);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const beam = new THREE.Mesh(beamGeo, beamMat);
  group.add(beam);

  // Bright core base bulb
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), coreMat);
  group.add(core);

  return group;
}

/**
 * Creates WWII twin-engine bomber silhouette.
 */
export function createBomberSilhouette(): THREE.Group {
  const bomber = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x090d16 });

  // Fuselage
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 12, 10), mat);
  fuse.rotation.x = Math.PI / 2;
  bomber.add(fuse);

  // Wingspan
  const wing = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 3.2), mat);
  wing.position.set(0, 0, 1.2);
  bomber.add(wing);

  // Twin engine nacelles
  for (const x of [-4.5, 4.5]) {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 3.8, 8), mat);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(x, -0.2, 1.2);
    bomber.add(eng);
  }

  // Tailplane
  const tail = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.18, 1.6), mat);
  tail.position.set(0, 0.3, -5.2);
  bomber.add(tail);

  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 1.8), mat);
  rudder.position.set(0, 1.2, -5.2);
  bomber.add(rudder);

  return bomber;
}

/**
 * Creates the balanced cantilever seesaw demonstration prop.
 */
export function createCantileverSeesaw(): THREE.Group {
  const g = new THREE.Group();

  const steelMat = new THREE.MeshLambertMaterial({ color: 0x4f5866 });
  const pivotMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0xa8724a });

  // Central triangular fulcrum pivot
  const fulcrumGeo = new THREE.ConeGeometry(0.85, 1.6, 4);
  const fulcrum = new THREE.Mesh(fulcrumGeo, pivotMat);
  fulcrum.rotation.y = Math.PI / 4;
  fulcrum.position.y = 0.8;
  fulcrum.castShadow = true;
  g.add(fulcrum);

  // Fulcrum pin
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), steelMat);
  pin.rotation.z = Math.PI / 2;
  pin.position.y = 1.6;
  g.add(pin);

  // Balanced cantilever seesaw beam
  const beamGeo = new THREE.BoxGeometry(8.5, 0.28, 1.0);
  const beam = new THREE.Mesh(beamGeo, woodMat);
  beam.position.y = 1.7;
  beam.castShadow = true;
  g.add(beam);

  // Outer suspended center block (demonstrating suspended span)
  const centerBlock = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.65, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x2563eb })
  );
  centerBlock.position.set(0, 2.35, 0);
  centerBlock.castShadow = true;
  g.add(centerBlock);

  // Tension strings holding the middle block in mid-air
  const cordL = createTrussBar(
    new THREE.Vector3(-3.8, 1.8, 0),
    new THREE.Vector3(-0.9, 2.35, 0),
    0.05,
    steelMat
  );
  const cordR = createTrussBar(
    new THREE.Vector3(3.8, 1.8, 0),
    new THREE.Vector3(0.9, 2.35, 0),
    0.05,
    steelMat
  );
  g.add(cordL, cordR);

  return g;
}

/**
 * Creates Hooghly River ghat steps along the bank.
 */
export function createRiverGhat(width = 36, steps = 8): THREE.Group {
  const ghat = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x948e83 });

  const stepRise = 0.35;
  const stepRun = 0.8;
  for (let i = 0; i < steps; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(width, stepRise, stepRun * (steps - i)),
      stoneMat
    );
    step.position.set(0, i * stepRise + stepRise / 2, -(steps - i) * (stepRun / 2));
    step.receiveShadow = true;
    ghat.add(step);
  }

  return ghat;
}
