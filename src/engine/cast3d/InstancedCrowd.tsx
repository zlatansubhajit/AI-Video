import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getToonGradientMap } from "../toon/applyToonPipeline";

export interface AvoidZone {
  x: number;
  z: number;
  radius: number;
}

export interface InstancedCrowdProps {
  count: number;
  seed: number;
  /** [minX, maxX, minZ, maxZ] */
  bounds: [number, number, number, number];
  avoidZones?: AvoidZone[];
  action?: "dig" | "cheer" | "idle";
}

/** Deterministic Mulberry32 PRNG (zero Math.random). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CrowdMember {
  x: number;
  z: number;
  facing: number;
  scale: number;
  phase: number;
  shirtColor: THREE.Color;
  hatColor: THREE.Color;
  hasHat: boolean;
}

const SHIRT_PALETTE = [
  "#c84b31",
  "#4e8c57",
  "#4c77a8",
  "#d99b26",
  "#7b5ea7",
  "#c96b85",
  "#3d8b8b",
];

const HAT_PALETTE = ["#e0b553", "#6b4c35", "#3a4559", "#a84432"];

export const InstancedCrowd: React.FC<InstancedCrowdProps> = ({
  count,
  seed,
  bounds,
  avoidZones = [],
  action = "dig",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const hatRef = useRef<THREE.InstancedMesh>(null);
  const toolRef = useRef<THREE.InstancedMesh>(null);

  const gradientMap = useMemo(() => getToonGradientMap(3), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const [minX, maxX, minZ, maxZ] = bounds;
  // Serialize zones so inline array literals do not invalidate the placement
  // memo on every Remotion frame.
  const avoidKey = avoidZones
    .map((zone) => `${zone.x}:${zone.z}:${zone.radius}`)
    .join("|");

  const members = useMemo<CrowdMember[]>(() => {
    const rand = mulberry32(seed);
    const list: CrowdMember[] = [];
    let guard = 0;

    while (list.length < count && guard < count * 12) {
      guard++;
      const x = minX + rand() * (maxX - minX);
      const z = minZ + rand() * (maxZ - minZ);

      const blocked = avoidZones.some(
        (zone) => Math.hypot(x - zone.x, z - zone.z) < zone.radius
      );
      if (blocked) continue;

      list.push({
        x,
        z,
        facing: rand() * Math.PI * 2,
        scale: 0.88 + rand() * 0.22,
        phase: rand() * Math.PI * 2,
        shirtColor: new THREE.Color(
          SHIRT_PALETTE[Math.floor(rand() * SHIRT_PALETTE.length)]
        ),
        hatColor: new THREE.Color(
          HAT_PALETTE[Math.floor(rand() * HAT_PALETTE.length)]
        ),
        hasHat: rand() > 0.25,
      });
    }
    return list;
    // `avoidKey` stands in for the zone objects so inline literals stay stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, seed, minX, maxX, minZ, maxZ, avoidKey]);

  // Set per-instance colors once
  useLayoutEffect(() => {
    if (!bodyRef.current || !hatRef.current) return;
    members.forEach((m, i) => {
      bodyRef.current!.setColorAt(i, m.shirtColor);
      hatRef.current!.setColorAt(i, m.hatColor);
    });
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    if (hatRef.current.instanceColor) hatRef.current.instanceColor.needsUpdate = true;
  }, [members]);

  // Update transforms deterministically every Remotion frame
  useLayoutEffect(() => {
    if (!bodyRef.current || !headRef.current || !hatRef.current || !toolRef.current) {
      return;
    }

    members.forEach((m, i) => {
      const cyc = Math.sin(t * 6.2 + m.phase);
      const hop = action === "cheer" ? Math.abs(Math.sin(t * 7.4 + m.phase)) * 0.22 : 0;
      const pitch = action === "dig" ? 0.22 + cyc * 0.3 : 0;
      const yOffset = hop + (action === "dig" ? -Math.max(0, cyc) * 0.06 : 0);

      // Torso
      dummy.position.set(m.x, (0.68 + yOffset) * m.scale, m.z);
      dummy.rotation.set(pitch, m.facing, 0);
      dummy.scale.setScalar(m.scale);
      dummy.updateMatrix();
      bodyRef.current!.setMatrixAt(i, dummy.matrix);

      // Head
      const headForward = Math.sin(pitch) * 0.58 * m.scale;
      const headUp = Math.cos(pitch) * 0.58 * m.scale;
      dummy.position.set(
        m.x + Math.sin(m.facing) * headForward,
        (0.68 + yOffset) * m.scale + headUp,
        m.z + Math.cos(m.facing) * headForward
      );
      dummy.rotation.set(pitch * 0.5, m.facing, 0);
      dummy.scale.setScalar(m.scale);
      dummy.updateMatrix();
      headRef.current!.setMatrixAt(i, dummy.matrix);

      // Hat (scaled to 0 if member has no hat)
      dummy.position.y += 0.24 * m.scale;
      dummy.scale.setScalar(m.hasHat ? m.scale : 0.0001);
      dummy.updateMatrix();
      hatRef.current!.setMatrixAt(i, dummy.matrix);

      // Shovel / Tool (visible during dig action)
      if (action === "dig") {
        const reach = 0.42 * m.scale;
        dummy.position.set(
          m.x + Math.sin(m.facing) * reach,
          (0.65 + yOffset - cyc * 0.18) * m.scale,
          m.z + Math.cos(m.facing) * reach
        );
        dummy.rotation.set(0.55 + cyc * 0.55, m.facing, 0);
        dummy.scale.setScalar(m.scale);
      } else {
        dummy.scale.setScalar(0.0001);
      }
      dummy.updateMatrix();
      toolRef.current!.setMatrixAt(i, dummy.matrix);
    });

    bodyRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    hatRef.current.instanceMatrix.needsUpdate = true;
    toolRef.current.instanceMatrix.needsUpdate = true;
  }, [frame, t, members, action, dummy]);

  return (
    <group name="instanced_crowd">
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, members.length]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.23, 0.42, 6, 12]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>

      <instancedMesh
        ref={headRef}
        args={[undefined, undefined, members.length]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.29, 12, 12]} />
        <meshToonMaterial color="#f5caa6" gradientMap={gradientMap} />
      </instancedMesh>

      <instancedMesh
        ref={hatRef}
        args={[undefined, undefined, members.length]}
        castShadow
      >
        <cylinderGeometry args={[0.38, 0.42, 0.16, 12]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>

      <instancedMesh
        ref={toolRef}
        args={[undefined, undefined, members.length]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
        <meshToonMaterial color="#8d5d36" gradientMap={gradientMap} />
      </instancedMesh>
    </group>
  );
};
