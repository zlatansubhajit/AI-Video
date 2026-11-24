import type { Episode } from "../../engine/shot/types";

// The Shawshank lesson, cut to the measured voice timeline (50.77 s).
// Frame boundaries come straight from public/audio/shawshank_hope_timeline.json.
export const shawshankHope: Episode = {
  id: "shawshank-hope",
  title: "Hope Chips Through",
  fps: 30,
  frames: 1523,
  width: 1080,
  height: 1920,
  scenes: {
    // cold stone cell, tiny hammer in hand
    cell_hook: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "hook" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0.18, 1.5, 4.2], target: [0.08, 1.12, -1.2], fov: 40 },
    },
    // gray exercise yard, Red's warning
    prison_yard: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "yard" },
      light: "overcast",
      sun: { az: 165, el: 50 },
      camera: { position: [0, 1.55, 9.2], target: [0, 1.38, 4.2], fov: 44 },
    },
    // the Rita poster on the cell wall
    cell_poster: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "poster" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0.1, 1.45, 3.25], target: [0.1, 1.33, -1.2], fov: 38 },
    },
    // years of nightly chipping at the wall
    cell_chipping: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "chip" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0.85, 1.3, 3.35], target: [-0.05, 1.12, -1.5], fov: 38 },
    },
    // the broken wall and the tunnel beyond
    cell_breach: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "breach" },
      light: "night",
      sun: { az: 145, el: 40 },
      camera: { position: [0, 1.35, 3.7], target: [0.13, 1.22, -1.4], fov: 40 },
    },
    // rain on the outside: arms raised
    freedom_storm: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "storm" },
      light: "night",
      sun: { az: 152, el: 34 },
      camera: { position: [0.3, 0.56, 5.1], target: [0.02, 1.5, -0.3], fov: 42 },
    },
    // golden meadow, quiet open-handed resolve
    freedom_sunrise: {
      kind: "code",
      stage: "shawshank",
      options: { mode: "sunrise" },
      light: "golden",
      camera: { position: [0.15, 0.9, 5.0], target: [0.1, 1.15, 0], fov: 40 },
    },
  },
  shots: [
    {
      scene: "cell_hook",
      frames: [0, 238],
      camera: { move: "push", from: 0, to: 1.2, ease: "smoother" },
      kick: 0.3,
      kickAt: 210, // "patience"
      dof: 3,
      cast: [
        {
          actor: "andy",
          at: [0.02, 0, -0.35],
          facing: 4,
          action: "study_hammer",
          look: 0.5,
          exprTimeline: [
            { frame: 0, expr: "stern" },
            { frame: 150, expr: "pained" },
            { frame: 205, expr: "stern" },
          ],
        },
      ],
    },
    {
      scene: "prison_yard",
      frames: [238, 473],
      camera: { move: "truck", from: -0.5, to: 0.5, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "andy",
          at: [-0.55, 0, 4.42],
          facing: 34,
          action: "listen_grave",
          look: -0.3,
          exprTimeline: [
            { frame: 238, expr: "neutral" },
            { frame: 330, expr: "pained" },
            { frame: 408, expr: "stern" },
          ],
        },
        {
          actor: "red",
          at: [0.52, 0, 4.58],
          facing: -32,
          action: "warn",
          look: -0.8,
          exprTimeline: [{ frame: 238, expr: "stern" }],
        },
      ],
    },
    {
      scene: "cell_poster",
      frames: [473, 673],
      camera: { move: "push", from: 0, to: 1.0, ease: "smoother" },
      dof: 2,
      cast: [
        {
          actor: "andy",
          at: [-0.24, 0, -0.32],
          facing: 0,
          action: "poster_glance",
          look: 0.85,
          exprTimeline: [
            { frame: 473, expr: "neutral" },
            { frame: 560, expr: "stern" },
            { frame: 615, expr: "relief" },
          ],
        },
      ],
    },
    {
      scene: "cell_chipping",
      frames: [673, 958],
      camera: { move: "creep", speed: 0.08, ease: "linear" },
      kick: 0.25,
      kickAt: 915, // "nineteen"
      dof: 2,
      cast: [
        {
          actor: "andy",
          at: [-0.18, 0, -0.34],
          facing: 18,
          action: "chip_wall",
          look: 0.55,
          exprTimeline: [
            { frame: 673, expr: "stern" },
            { frame: 800, expr: "pained" },
            { frame: 870, expr: "stern" },
            { frame: 912, expr: "pained" },
            { frame: 926, expr: "stern" },
          ],
        },
      ],
    },
    {
      scene: "cell_breach",
      frames: [958, 1134],
      camera: { move: "push", from: 0, to: 1.3, ease: "smoother" },
      kick: 0.45,
      kickAt: 1030, // "shattered"
      dof: 0,
      cast: [],
    },
    {
      scene: "freedom_storm",
      frames: [1134, 1263],
      camera: { move: "push", from: 0, to: 1.4, ease: "smoother" },
      kick: 0.35,
      kickAt: 1241, // "free"
      dof: 0,
      cast: [
        {
          actor: "andy_wet",
          at: [0.05, -0.12, 0.25],
          facing: 0,
          action: "triumph",
          exprTimeline: [
            { frame: 1134, expr: "relief" },
            { frame: 1200, expr: "relief_open" },
            { frame: 1238, expr: "relief" },
          ],
        },
      ],
    },
    {
      scene: "freedom_sunrise",
      frames: [1263, 1523],
      camera: { move: "push", from: 0, to: 1.1, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "andy",
          at: [0.1, 0, -0.3],
          facing: 0,
          action: "free_stand",
          exprTimeline: [
            { frame: 1263, expr: "relief" },
            { frame: 1400, expr: "smile_closed" },
            { frame: 1470, expr: "smile" },
          ],
        },
      ],
    },
  ],
  audio: {
    voice: "audio/shawshank_hope_mix.mp3",
  },
};
