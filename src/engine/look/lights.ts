// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
import type { LightName } from "../shot/types";

type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.32, 0.32, 0.34], lift: [0.03, 0.03, 0.04], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 25, el: 22,
    lit: [1.5, 0.78, 0.32], shade: [0.24, 0.22, 0.20], lift: [0.02, 0.02, 0.03], lambert: 0.35, sideK: 0.82, term: 0.12,
    charTint: [1.0, 0.82, 0.62], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.88, 0.82, 0.90],
    blob: [0.65, 0.62, 0.68], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 4.8, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // flat, soft, slightly cool: the light for rain and snow. No sun disc, pale
  // contact blobs, and a terminator wide enough that the two-tone world reads
  // as ambient occlusion rather than a hard key.
  overcast: {
    az: 40, el: 55,
    lit: [1.06, 1.07, 1.1], shade: [0.52, 0.55, 0.62], lift: [0.04, 0.04, 0.06], lambert: 0.32, sideK: 0.9, term: 0.5,
    charTint: [0.95, 0.97, 1.02], charShade: 0.9, charGrad: 0.05, bodyGrad: 0.16, sideTint: [0.93, 0.94, 0.99],
    blob: [0.5, 0.52, 0.58], actorShadow: false,
    top: "#7d8fa3", hor: "#cdd5dd", skyCurve: [0.0, 0.5, 0.6], fog: "#c3ccd5", fogNear: 20, fogFar: 260, sunDisc: "#000000",
    sunCol: "#e9eef4", sunI: 1.0, sky: "#e2e9f0", ground: "#9aa0a4", hemiI: 0.95,
    bias: -0.00025, normalBias: 0.015,
  },
  // nocturnal moonlit woods: deep indigo ambient, silvery moon key, high contrast
  night: {
    az: 35, el: 38,
    lit: [0.82, 0.92, 1.15], shade: [0.15, 0.16, 0.20], lift: [0.02, 0.02, 0.04], lambert: 0.35, sideK: 0.82, term: 0.15,
    charTint: [0.88, 0.92, 1.05], charShade: 0.85, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.82, 0.84, 0.98],
    blob: [0.15, 0.16, 0.20], actorShadow: true,
    top: "#080d1a", hor: "#16223d", skyCurve: [0.0, 0.45, 0.8], fog: "#10172a", fogNear: 15, fogFar: 220, sunDisc: "#d8e6ff",
    sunCol: "#b5d0ff", sunI: 2.2, sky: "#142240", ground: "#0a101d", hemiI: 0.45,
    bias: -0.0003, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  overcast: {
    sky: { c: ["#cfd7de", "#c6d0d8", "#b4c0cb", "#a0aebc", "#8695a6"], e: [0, 3, 8, 16, 40] },
    water: { near: "#5a7a8a", mid: "#4a6a7c", far: "#3f5a6c", crest: "#9fb6c2", trough: "#2f4a5c", glint: "#e8f0f4", shade: [0.5, 0.54, 0.6] },
    cloud: { lit: "#e6eaee", mid: "#c6cdd5", shade: "#a2adba" },
    bounce: [0, 0, 0],
    sat: 0.72,
  },
  night: {
    sky: { c: ["#182645", "#131f3b", "#0f1930", "#0b1224", "#060a16"], e: [0, 4, 10, 20, 40] },
    water: { near: "#0a1932", mid: "#081326", far: "#060e1d", crest: "#4a7bb5", trough: "#040914", glint: "#d8e6ff", shade: [0.3, 0.36, 0.55] },
    cloud: { lit: "#2a3b60", mid: "#1a2642", shade: "#10182c" },
    bounce: [0.01, 0.02, 0.05],
    sat: 0.88,
  },
};
