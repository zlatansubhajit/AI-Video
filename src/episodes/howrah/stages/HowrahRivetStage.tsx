import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { createHowrahMaterials, createTrussBar } from "../props";

export const HowrahRivetStage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const { group, hotRivet, hammer, sparkLight } = useMemo(() => {
    const root = new THREE.Group();
    const { steelMat, rivetMacroMat } = createHowrahMaterials();

    // Massive High-Tensile Steel Girder Plate
    const girderPlate = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 5.4, 0.4),
      rivetMacroMat
    );
    girderPlate.position.set(0, 2.5, 0);
    girderPlate.receiveShadow = true;
    root.add(girderPlate);

    // Cross Flange I-Beam Gusset Sections
    const flangeTop = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.45, 1.8),
      steelMat
    );
    flangeTop.position.set(0, 5.3, 0.6);
    root.add(flangeTop);

    const flangeBottom = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.45, 1.8),
      steelMat
    );
    flangeBottom.position.set(0, -0.2, 0.6);
    root.add(flangeBottom);

    // Red-Hot Glowing Rivet in the foreground
    const hotRivetMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    const hotRivetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hotRivetMat
    );
    hotRivetMesh.position.set(0.6, 2.4, 0.22);
    root.add(hotRivetMesh);

    // Pneumatic Riveting Hammer
    const hammerGroup = new THREE.Group();
    const hammerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.32, 2.2, 12),
      new THREE.MeshLambertMaterial({ color: 0x22262e })
    );
    hammerBody.rotation.x = Math.PI / 2;
    hammerGroup.add(hammerBody);

    const hammerDie = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12),
      new THREE.MeshLambertMaterial({ color: 0x556070 })
    );
    hammerDie.rotation.x = Math.PI / 2;
    hammerDie.position.z = -1.3;
    hammerGroup.add(hammerDie);

    hammerGroup.position.set(0.6, 2.4, 2.2);
    root.add(hammerGroup);

    // Forbidden Crossed-Out Nut & Bolt Graphic (Humorous Contrast)
    const forbiddenSign = new THREE.Group();
    forbiddenSign.position.set(-2.2, 2.8, 0.45);

    // Standard Hex Bolt & Nut (Grey)
    const boltMat = new THREE.MeshLambertMaterial({ color: 0x8a929e });
    const boltShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 6), boltMat);
    boltShaft.rotation.z = Math.PI / 4;
    forbiddenSign.add(boltShaft);

    const hexNut = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 6), boltMat);
    hexNut.rotation.z = Math.PI / 4;
    hexNut.position.set(0.2, 0.2, 0);
    forbiddenSign.add(hexNut);

    // Red Warning Ring (Circle)
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const ringGeo = new THREE.RingGeometry(0.95, 1.15, 32);
    const ring = new THREE.Mesh(ringGeo, redMat);
    forbiddenSign.add(ring);

    // Red Diagonal Slash
    const slashGeo = new THREE.BoxGeometry(0.18, 2.1, 0.05);
    const slash = new THREE.Mesh(slashGeo, redMat);
    slash.rotation.z = Math.PI / 4;
    forbiddenSign.add(slash);

    root.add(forbiddenSign);

    // Hot spark point light
    const spark = new THREE.PointLight(0xff7700, 2.5, 4);
    spark.position.set(0.6, 2.4, 0.8);
    root.add(spark);

    // Industrial Inspection Floodlight (illuminates the steel plate & rivets)
    const floodlight = new THREE.PointLight(0xffedd5, 3.2, 12);
    floodlight.position.set(0, 3.2, 3.5);
    root.add(floodlight);

    return { group: root, hotRivet: hotRivetMesh, hammer: hammerGroup, sparkLight: spark };
  }, []);

  // Hammer rapid striking motion
  const strikeCycle = Math.sin(t * 18);
  const hammerZ = 1.4 + (strikeCycle > 0 ? strikeCycle * 0.4 : 0);
  hammer.position.z = hammerZ;

  // Impact flash whenever hammer strikes
  const isImpact = strikeCycle <= 0.05 && strikeCycle >= -0.15;
  sparkLight.intensity = isImpact ? 5.0 : 1.2;

  return <primitive object={group} />;
};
