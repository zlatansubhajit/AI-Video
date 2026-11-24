import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { createHowrahMaterials, createCantileverSeesaw, createHowrahTower } from "../props";

export const HowrahSeesawStage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const { group, seesaw, arrowDownL, arrowDownR, arrowUpMid } = useMemo(() => {
    const root = new THREE.Group();
    const { steelMat, concreteMat } = createHowrahMaterials();

    // Raised Riverbank Terrace / Demonstration Lawn
    const terraceGeo = new THREE.BoxGeometry(24, 1.4, 20);
    const terrace = new THREE.Mesh(terraceGeo, concreteMat);
    terrace.position.set(0, 0.7, 0);
    terrace.receiveShadow = true;
    root.add(terrace);

    // Stone Balustrade behind
    const balustradeGeo = new THREE.BoxGeometry(24, 1.0, 0.4);
    const balustrade = new THREE.Mesh(
      balustradeGeo,
      new THREE.MeshLambertMaterial({ color: 0x9ca3af })
    );
    balustrade.position.set(0, 1.9, -9.6);
    root.add(balustrade);

    // Balanced Cantilever Demonstration Apparatus in the center
    const seesawModel = createCantileverSeesaw();
    seesawModel.position.set(0, 1.4, 0);
    root.add(seesawModel);

    // Force Vector Arrows (Cartoon Physics Demonstration)
    const arrowMatDown = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // red anchor force
    const arrowMatUp = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // green suspended span lift

    // Downward arrow Left (Anchor Arm)
    const arrowL = new THREE.Group();
    const shaftL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), arrowMatDown);
    shaftL.position.y = 0.6;
    const headL = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 8), arrowMatDown);
    headL.rotation.x = Math.PI; // point down
    arrowL.add(shaftL, headL);
    arrowL.position.set(-3.6, 3.2, 0);
    root.add(arrowL);

    // Downward arrow Right (Anchor Arm)
    const arrowR = arrowL.clone();
    arrowR.position.x = 3.6;
    root.add(arrowR);

    // Upward arrow Center (Middle Suspended Span)
    const arrowMid = new THREE.Group();
    const shaftMid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), arrowMatUp);
    shaftMid.position.y = 0.7;
    const headMid = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), arrowMatUp);
    headMid.position.y = 1.4;
    arrowMid.add(shaftMid, headMid);
    arrowMid.position.set(0, 3.6, 0);
    root.add(arrowMid);

    // Distant background: Silhouette of Howrah Bridge towers across the river
    const distTower = createHowrahTower(30, 14, 7, steelMat);
    distTower.position.set(24, 2, -36);
    distTower.scale.setScalar(0.7);
    root.add(distTower);

    return {
      group: root,
      seesaw: seesawModel,
      arrowDownL: arrowL,
      arrowDownR: arrowR,
      arrowUpMid: arrowMid,
    };
  }, []);

  // Gentle seesaw balancing oscillation
  const tilt = 0.045 * Math.sin(t * 2.2);
  seesaw.rotation.z = tilt;

  // Pulsing animation for the force arrows
  const pulse = 1.0 + 0.12 * Math.sin(t * 3.5);
  arrowDownL.scale.set(pulse, pulse, pulse);
  arrowDownR.scale.set(pulse, pulse, pulse);
  arrowUpMid.scale.set(pulse, pulse, pulse);

  return <primitive object={group} />;
};
