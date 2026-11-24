import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { createHowrahMaterials, createKolkataTram, createTrussBar } from "../props";

export const HowrahDeckStage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const { group, tram, sparkLight, catenaryWire } = useMemo(() => {
    const root = new THREE.Group();
    const { steelMat, deckMat, darkSteelMat, tramBodyMat } = createHowrahMaterials();

    const ROAD_W = 14;
    const ROAD_L = 120;

    // Road Deck Plane with dual tram tracks
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(ROAD_W, 1.2, ROAD_L),
      deckMat
    );
    deck.position.set(0, 0, 0);
    deck.receiveShadow = true;
    root.add(deck);

    // Side Pedestrian Footpaths (slightly raised curbs)
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x6e757d });
    const curbL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, ROAD_L), curbMat);
    curbL.position.set(-ROAD_W / 2 + 1.2, 0.75, 0);
    curbL.receiveShadow = true;
    const curbR = curbL.clone();
    curbR.position.x = ROAD_W / 2 - 1.2;
    root.add(curbL, curbR);

    // Lattice Guard Railings
    const railMat = new THREE.MeshLambertMaterial({ color: 0x3d4450 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, ROAD_L), railMat);
    railL.position.set(-ROAD_W / 2 + 0.1, 1.3, 0);
    const railR = railL.clone();
    railR.position.x = ROAD_W / 2 - 0.1;
    root.add(railL, railR);

    // Overhead Steel Portal Frames and Sway Bracing
    const portalSpacing = 16;
    const portalH = 14;
    for (let z = -ROAD_L / 2 + 8; z <= ROAD_L / 2 - 8; z += portalSpacing) {
      // Twin vertical lattice posts
      const postL1 = new THREE.Vector3(-ROAD_W / 2 + 0.3, 0.6, z);
      const postL2 = new THREE.Vector3(-ROAD_W / 2 + 0.3, portalH, z);
      const postR1 = new THREE.Vector3(ROAD_W / 2 - 0.3, 0.6, z);
      const postR2 = new THREE.Vector3(ROAD_W / 2 - 0.3, portalH, z);

      root.add(createTrussBar(postL1, postL2, 0.9, steelMat));
      root.add(createTrussBar(postR1, postR2, 0.9, steelMat));

      // Overhead cross beam
      root.add(createTrussBar(postL2, postR2, 0.8, steelMat));

      // Overhead X-bracing truss
      const postMidL = new THREE.Vector3(-ROAD_W / 2 + 0.3, portalH - 3.2, z);
      const postMidR = new THREE.Vector3(ROAD_W / 2 - 0.3, portalH - 3.2, z);
      root.add(createTrussBar(postMidL, postR2, 0.5, steelMat));
      root.add(createTrussBar(postMidR, postL2, 0.5, steelMat));

      // Vertical hanger cords rising to unseen cantilever chords above
      const hangerTopL = new THREE.Vector3(-ROAD_W / 2 + 0.3, portalH + 16, z);
      const hangerTopR = new THREE.Vector3(ROAD_W / 2 - 0.3, portalH + 16, z);
      root.add(createTrussBar(postL2, hangerTopL, 0.3, steelMat));
      root.add(createTrussBar(postR2, hangerTopR, 0.3, steelMat));
    }

    // Overhead Catenary Electric Wire down the center
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, ROAD_L, 6), wireMat);
    wire.rotation.x = Math.PI / 2;
    wire.position.set(0, 6.8, 0);
    root.add(wire);

    // The Vintage 1940s Kolkata Tramcar (oriented along track axis Z)
    const tramCar = createKolkataTram(tramBodyMat, steelMat);
    tramCar.rotation.y = -Math.PI / 2; // facing forward down the track
    tramCar.position.set(0, 0.6, 12);
    root.add(tramCar);

    // Warm streetlamps along the sidewalks
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe28a });
    for (let lz = -ROAD_L / 2 + 16; lz <= ROAD_L / 2 - 16; lz += 24) {
      for (const lx of [-ROAD_W / 2 + 1.2, ROAD_W / 2 - 1.2]) {
        const lampPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8),
          steelMat
        );
        lampPost.position.set(lx, 2.7, lz);
        root.add(lampPost);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), lampMat);
        bulb.position.set(lx, 4.8, lz);
        root.add(bulb);

        const lampLight = new THREE.PointLight(0xffcc66, 1.2, 18);
        lampLight.position.set(lx, 4.6, lz);
        root.add(lampLight);
      }
    }

    // Electric spark point light at the trolley tip
    const spark = new THREE.PointLight(0xa5f3fc, 2.5, 10);
    spark.position.set(0, 7.0, 12);
    root.add(spark);

    return { group: root, tram: tramCar, sparkLight: spark, catenaryWire: wire };
  }, []);

  // Tram movement along the bridge deck
  // Smoothly rolls forward through the dark
  const tramZ = 28 - (frame % 300) * 0.28;
  tram.position.z = tramZ;

  // Gentle mechanical vibration
  tram.position.y = 0.6 + 0.012 * Math.sin(frame * 1.8);
  tram.rotation.z = 0.006 * Math.sin(frame * 0.9);

  // Sporadic electric spark flashes at the catenary wire
  const isSpark = Math.sin(frame * 3.7) > 0.82;
  sparkLight.position.z = tramZ;
  sparkLight.intensity = isSpark ? 4.5 + Math.random() * 3.0 : 0.2;

  return <primitive object={group} />;
};
