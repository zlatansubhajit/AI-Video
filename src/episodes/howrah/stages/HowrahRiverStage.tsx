import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { createHowrahMaterials, createHowrahBridgeFull, createRiverGhat } from "../props";

export const HowrahRiverStage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const { group, bridge, riverWater, boats } = useMemo(() => {
    const root = new THREE.Group();
    const { steelMat, deckMat, concreteMat, waterMat } = createHowrahMaterials();

    // River Hooghly Water Surface
    const waterGeo = new THREE.PlaneGeometry(320, 240, 32, 24);
    const river = new THREE.Mesh(waterGeo, waterMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.4, 0);
    river.receiveShadow = true;
    root.add(river);

    // Riverbed ground underneath
    const bedGeo = new THREE.PlaneGeometry(360, 280);
    const bedMat = new THREE.MeshLambertMaterial({ color: 0x141a18 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, -0.6, 0);
    root.add(bed);

    // Riverbanks (Kolkata side & Howrah side)
    const bankMat = new THREE.MeshLambertMaterial({ color: 0x4a473f });
    const bankL = new THREE.Mesh(new THREE.BoxGeometry(70, 7.5, 260), bankMat);
    bankL.position.set(-90, 3.75, 0);
    bankL.receiveShadow = true;
    const bankR = bankL.clone();
    bankR.position.x = 90;
    root.add(bankL, bankR);

    // Stone ghats along both riverbanks
    const ghatL = createRiverGhat(48, 9);
    ghatL.rotation.y = Math.PI / 2;
    ghatL.position.set(-54, 0.5, 12);
    root.add(ghatL);

    const ghatR = createRiverGhat(48, 9);
    ghatR.rotation.y = -Math.PI / 2;
    ghatR.position.set(54, 0.5, -12);
    root.add(ghatR);

    // The Colossal Howrah Bridge Cantilever Superstructure
    const bridgeMesh = createHowrahBridgeFull(steelMat, deckMat, concreteMat);
    bridgeMesh.position.set(0, 0, 0);
    root.add(bridgeMesh);

    // Traditional Bengali country boats (dinghies/sampans) moored in the river
    const boatList: THREE.Group[] = [];
    const woodBoatMat = new THREE.MeshLambertMaterial({ color: 0x543d2b });
    const boatGeo = new THREE.CylinderGeometry(0.85, 0.45, 6.2, 8, 1, false, 0, Math.PI);

    const boatConfigs = [
      { x: -32, z: 22, rot: 0.3 },
      { x: -25, z: 34, rot: -0.2 },
      { x: 28, z: 26, rot: 0.4 },
      { x: 38, z: 42, rot: -0.5 },
    ];

    for (const cfg of boatConfigs) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(boatGeo, woodBoatMat);
      hull.rotation.z = Math.PI / 2;
      hull.position.y = 0.35;
      boat.add(hull);

      // Small arched bamboo hood
      const hoodGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.4, 8, 1, true, 0, Math.PI);
      const hoodMat = new THREE.MeshLambertMaterial({ color: 0xb59e6c });
      const hood = new THREE.Mesh(hoodGeo, hoodMat);
      hood.rotation.z = Math.PI / 2;
      hood.position.set(0, 0.85, 0);
      boat.add(hood);

      // Tiny warm lantern glow on boat
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      );
      lantern.position.set(2.2, 0.7, 0);
      boat.add(lantern);

      boat.position.set(cfg.x, 0.35, cfg.z);
      boat.rotation.y = cfg.rot;
      root.add(boat);
      boatList.push(boat);
    }

    // Distant bank palm trees & silhouette structures
    const palmTrunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x2d4a2a });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const pz = -60 + i * 25;
        const px = side * (75 + (i % 3) * 6);
        const palm = new THREE.Group();

        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.35, 9.5, 6),
          palmTrunkMat
        );
        trunk.position.y = 4.75;
        trunk.rotation.z = side * 0.08;
        palm.add(trunk);

        const frondGeo = new THREE.ConeGeometry(3.2, 1.2, 6);
        const frond = new THREE.Mesh(frondGeo, palmLeafMat);
        frond.position.y = 9.8;
        palm.add(frond);

        palm.position.set(px, 7.5, pz);
        root.add(palm);
      }
    }

    return { group: root, bridge: bridgeMesh, riverWater: river, boats: boatList };
  }, []);

  // Gentle river swell & boat bobbing animation
  riverWater.position.y = 0.4 + 0.04 * Math.sin(t * 1.4);
  boats.forEach((b, i) => {
    b.position.y = 0.35 + 0.05 * Math.sin(t * 1.8 + i);
    b.rotation.z = 0.04 * Math.sin(t * 2.1 + i);
  });

  return <primitive object={group} />;
};
