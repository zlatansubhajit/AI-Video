import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { getToonGradientMap } from "../toon/applyToonPipeline";

function seeded(seed: number, index: number): number {
  const x = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Resolves either `startFrame` or the `triggerFrame` alias. */
function startOf(startFrame?: number, triggerFrame?: number): number {
  return startFrame ?? triggerFrame ?? 0;
}

/**
 * Stylized cartoon smoke poof (disguise switches, sudden prop spawns, bursts).
 */
export const SmokePoof: React.FC<{
  position: [number, number, number];
  startFrame?: number;
  /** Alias for `startFrame`. */
  triggerFrame?: number;
  durationFrames?: number;
  scale?: number;
  seed?: number;
}> = ({
  position,
  startFrame,
  triggerFrame,
  durationFrames = 20,
  scale = 1,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startOf(startFrame, triggerFrame);
  const gradientMap = useMemo(() => getToonGradientMap(3), []);

  const puffs = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const theta = seeded(seed, i * 3) * Math.PI * 2;
        const phi = seeded(seed, i * 3 + 1) * Math.PI * 0.7;
        const speed = 0.7 + seeded(seed, i * 3 + 2) * 0.9;
        return {
          dx: Math.cos(theta) * Math.sin(phi) * speed,
          dy: Math.cos(phi) * speed * 0.9 + 0.25,
          dz: Math.sin(theta) * Math.sin(phi) * speed,
          baseR: 0.22 + seeded(seed, i * 5) * 0.18,
        };
      }),
    [seed]
  );

  if (local < 0 || local > durationFrames) return null;
  const p = local / durationFrames;

  // Fast expand, smooth shrink out
  const env = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
  const spread = 1 - Math.pow(1 - p, 2.5);

  return (
    <group position={position} scale={scale}>
      {puffs.map((puff, i) => (
        <mesh
          key={i}
          position={[puff.dx * spread, puff.dy * spread, puff.dz * spread]}
          scale={Math.max(0.001, puff.baseR * env)}
        >
          <sphereGeometry args={[1, 12, 12]} />
          <meshToonMaterial color="#f5f3ef" gradientMap={gradientMap} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Parabolic stylized dirt clods popping out of digging holes.
 */
export const DirtBurst: React.FC<{
  position: [number, number, number];
  startFrame?: number;
  /** Alias for `startFrame`. */
  triggerFrame?: number;
  durationFrames?: number;
  seed?: number;
}> = ({
  position,
  startFrame,
  triggerFrame,
  durationFrames = 24,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startOf(startFrame, triggerFrame);
  const gradientMap = useMemo(() => getToonGradientMap(3), []);

  const clods = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const angle = seeded(seed, i * 4) * Math.PI * 2;
        const hSpeed = 0.8 + seeded(seed, i * 4 + 1) * 1.4;
        const vSpeed = 2.6 + seeded(seed, i * 4 + 2) * 1.8;
        return {
          vx: Math.cos(angle) * hSpeed,
          vy: vSpeed,
          vz: Math.sin(angle) * hSpeed,
          size: 0.06 + seeded(seed, i * 4 + 3) * 0.06,
          spin: (seeded(seed, i * 7) - 0.5) * 10,
        };
      }),
    [seed]
  );

  if (local < 0 || local > durationFrames) return null;
  const t = local / fps;
  const g = 9.8;

  const fade =
    1 - Math.max(0, (local - durationFrames * 0.7) / (durationFrames * 0.3));

  return (
    <group position={position}>
      {clods.map((c, i) => {
        const y = Math.max(0, c.vy * t - 0.5 * g * t * t);
        return (
          <mesh
            key={i}
            position={[c.vx * t, y, c.vz * t]}
            rotation={[t * c.spin, t * c.spin * 0.7, 0]}
            scale={Math.max(0.001, c.size * fade)}
            castShadow
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshToonMaterial color="#7a5638" gradientMap={gradientMap} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Peeling gold/paint chips for close-up macro reveal inserts.
 */
export const PaintFlakes: React.FC<{
  position: [number, number, number];
  startFrame?: number;
  /** Alias for `startFrame`. */
  triggerFrame?: number;
  durationFrames?: number;
  color?: string;
  seed?: number;
}> = ({
  position,
  startFrame,
  triggerFrame,
  durationFrames = 30,
  color = "#f5c938",
  seed = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startOf(startFrame, triggerFrame);
  const gradientMap = useMemo(() => getToonGradientMap(3), []);

  const chips = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x0: (seeded(seed, i * 5) - 0.5) * 0.4,
        y0: (seeded(seed, i * 5 + 1) - 0.5) * 0.3,
        z0: (seeded(seed, i * 5 + 2) - 0.5) * 0.4,
        vx: (seeded(seed, i * 5 + 3) - 0.5) * 1.1,
        vy: 0.4 + seeded(seed, i * 5 + 4) * 0.9,
        vz: 0.3 + seeded(seed, i * 6) * 0.8,
        delay: Math.floor(seeded(seed, i * 8) * 10),
      })),
    [seed]
  );

  if (local < 0 || local > durationFrames) return null;
  const t = local / fps;

  return (
    <group position={position}>
      {chips.map((c, i) => {
        const dt = Math.max(0, (local - c.delay) / fps);
        if (local < c.delay) return null;
        return (
          <mesh
            key={i}
            position={[
              c.x0 + c.vx * dt,
              c.y0 + c.vy * dt - 2.6 * dt * dt,
              c.z0 + c.vz * dt,
            ]}
            rotation={[dt * 6, dt * 8, dt * 4]}
          >
            <boxGeometry args={[0.07, 0.05, 0.01]} />
            <meshToonMaterial color={color} gradientMap={gradientMap} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Rapidly stacking comic gold coins driven by frame count.
 */
export const CoinStack: React.FC<{
  position: [number, number, number];
  startFrame?: number;
  /** Alias for `startFrame`. */
  triggerFrame?: number;
  count?: number;
  framesPerCoin?: number;
}> = ({
  position,
  startFrame,
  triggerFrame,
  count = 12,
  framesPerCoin = 2,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startOf(startFrame, triggerFrame);
  const gradientMap = useMemo(() => getToonGradientMap(3), []);

  if (local < 0) return null;

  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const dropLocal = local - i * framesPerCoin;
        if (dropLocal < 0) return null;
        const p = Math.min(1, dropLocal / 6);
        const y = i * 0.042 + (1 - p * p) * 0.85;
        const wobbleX = Math.sin(i * 2.1) * 0.012;
        const wobbleZ = Math.cos(i * 1.7) * 0.012;

        return (
          <mesh key={i} position={[wobbleX, y, wobbleZ]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.036, 18]} />
            <meshToonMaterial color="#ffcf33" gradientMap={gradientMap} />
          </mesh>
        );
      })}
    </group>
  );
};
