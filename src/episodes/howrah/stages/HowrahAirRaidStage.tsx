import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { createHowrahMaterials, createHowrahTower, createSearchlightBeam, createBomberSilhouette } from "../props";

export const HowrahAirRaidStage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const { group, searchlight1, searchlight2, searchlight3, bombers, flakBursts } = useMemo(() => {
    const root = new THREE.Group();
    const { steelMat } = createHowrahMaterials();

    // Dark Silhouette of Howrah Bridge Cantilever Pylon on the lower edge
    const tower = createHowrahTower(36, 16, 8, steelMat);
    tower.position.set(12, -18, -10);
    tower.rotation.y = -0.4;
    root.add(tower);

    // Distant Kolkata city rooftop silhouettes
    const cityMat = new THREE.MeshBasicMaterial({ color: 0x050810 });
    for (let i = 0; i < 14; i++) {
      const bh = 4 + (i % 5) * 3;
      const bw = 5 + (i % 3) * 2;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 6), cityMat);
      bldg.position.set(-28 + i * 5, -16 + bh / 2, -20);
      root.add(bldg);
    }

    // 3 Powerful Searchlight Beams scanning the sky
    const beam1 = createSearchlightBeam(95, 0.45, 14);
    beam1.position.set(-6, -10, -6);
    root.add(beam1);

    const beam2 = createSearchlightBeam(100, 0.45, 16);
    beam2.position.set(6, -10, -8);
    root.add(beam2);

    const beam3 = createSearchlightBeam(90, 0.4, 13);
    beam3.position.set(0, -10, -4);
    root.add(beam3);

    // WWII Twin-Engine Bomber Silhouettes
    const bomberList: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const bomber = createBomberSilhouette();
      bomber.position.set(-30 - i * 16, 12 + i * 4, -15 - i * 8);
      bomber.rotation.y = Math.PI / 2 + 0.15;
      bomber.rotation.z = -0.08;
      root.add(bomber);
      bomberList.push(bomber);
    }

    // Distant Anti-Aircraft Flak Burst Flashes
    const flakList: THREE.Mesh[] = [];
    const flakMat = new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true });
    for (let i = 0; i < 4; i++) {
      const flak = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), flakMat);
      flak.position.set(-18 + i * 12, 16 + (i % 2) * 6, -30);
      flak.visible = false;
      root.add(flak);
      flakList.push(flak);
    }

    return {
      group: root,
      searchlight1: beam1,
      searchlight2: beam2,
      searchlight3: beam3,
      bombers: bomberList,
      flakBursts: flakList,
    };
  }, []);

  // Sweeping Searchlight Animation (criss-crossing the sky)
  searchlight1.rotation.z = 0.28 * Math.sin(t * 0.85);
  searchlight1.rotation.x = 0.18 * Math.cos(t * 0.7);

  searchlight2.rotation.z = -0.32 * Math.sin(t * 0.95 + 1.2);
  searchlight2.rotation.x = -0.2 * Math.cos(t * 0.8 + 0.5);

  searchlight3.rotation.z = 0.22 * Math.cos(t * 1.1);

  // Bombers flying across the clouds directly in camera view
  bombers.forEach((b, i) => {
    const cycle = ((frame * 0.35 + i * 40) % 100) / 100;
    b.position.x = -7.0 + cycle * 14.0;
    b.position.y = 11.5 + i * 2.2 + Math.sin(cycle * Math.PI) * 0.6;
    b.position.z = -1.0 - i * 2.5;
  });

  // Sporadic flak bursts
  flakBursts.forEach((f, i) => {
    const active = (frame + i * 27) % 50 < 6;
    f.visible = active;
    if (active) {
      f.scale.setScalar(1.0 + Math.random() * 0.8);
    }
  });

  return <primitive object={group} />;
};
