import type { Episode } from "../../engine/shot/types";

export const pinewoodPart1: Episode = {
  id: "pinewood-part1",
  title: "Pinewood Night — Part 1: The Sound After The Fire",
  fps: 30,
  frames: 1170,
  width: 1080,
  height: 1920,
  scenes: {
    ember_cold_open: {
      kind: "code",
      stage: "woodsCampPart1",
      options: { mode: "ember_cold_open" },
      light: "night",
      camera: { position: [0.15, 1.15, 3.7], target: [0.0, 0.32, 1.25], fov: 40 },
    },
    trail_day: {
      kind: "code",
      stage: "woodsCampPart1",
      options: { mode: "trail_day" },
      light: "day",
      camera: { position: [0.35, 1.78, 18.2], target: [0.0, 1.05, 10.5], fov: 44 },
    },
    pup_rescue: {
      kind: "code",
      stage: "woodsCampPart1",
      options: { mode: "pup_rescue" },
      light: "day",
      camera: { position: [0.05, 1.22, 3.8], target: [0.0, 0.52, 0.95], fov: 42 },
    },
    camp_dusk_to_night: {
      kind: "code",
      stage: "woodsCampPart1",
      options: { mode: "camp_dusk_to_night" },
      light: "golden",
      camera: { position: [0.0, 1.75, 6.2], target: [0.0, 0.92, 0.2], fov: 44 },
    },
    tent_wolf_howl: {
      kind: "code",
      stage: "woodsCampPart1",
      options: { mode: "tent_wolf_howl" },
      light: "night",
      // 2.65m MCU framing on Leo (waist-to-head + open tent context)
      camera: { position: [0.28, 1.12, 1.55], target: [0.32, 0.68, -1.1], fov: 42 },
    },
    tent_zipper_cliffhanger: {
      kind: "code",
      stage: "woodsCampPart1",
      options: { mode: "tent_zipper_cliffhanger" },
      light: "night",
      // 2.8m MCU showing Leo, Sam's empty flat bag, and animated tent zipper
      camera: { position: [0.0, 1.08, 1.7], target: [0.0, 0.66, -1.0], fov: 40 },
    },
  },
  shots: [
    {
      scene: "ember_cold_open",
      frames: [0, 105],
      light: "night",
      camera: { move: "push", from: 0.0, to: -0.9, ease: "smoother" },
      dof: 4,
      cast: [],
    },
    {
      scene: "trail_day",
      frames: [105, 300],
      light: "day",
      camera: { move: "push", from: 0.0, to: 2.2, ease: "smoother" },
      dof: 0, // Always 0 on wide/walking shots
      cast: [
        {
          actor: "leo",
          at: [-0.55, 0.01, 14.8],
          to: [-0.55, 0.01, 10.6],
          facing: 180,
          action: "hike",
          ease: "linear",
          exprTimeline: [{ frame: 105, expr: "grin" }],
        },
        {
          actor: "sam",
          at: [0.58, 0.01, 14.1],
          to: [0.58, 0.01, 9.9],
          facing: 180,
          action: "hike",
          actionOffset: 0.35,
          ease: "linear",
          exprTimeline: [{ frame: 105, expr: "laugh" }],
          look: -0.4,
        },
      ],
    },
    {
      scene: "pup_rescue",
      frames: [300, 495],
      light: "day",
      camera: { move: "orbit", from: -12, to: 14, ease: "smoother" },
      dof: 3,
      cast: [
        {
          actor: "leo",
          at: [-0.48, 0.01, 0.95],
          facing: 65,
          action: "camp_sit",
          look: 0.55,
          exprTimeline: [
            { frame: 300, expr: "neutral" },
            { frame: 405, expr: "smile" }, // Swaps as red rope frees pup
          ],
        },
        {
          actor: "sam",
          at: [0.92, 0.01, 0.35],
          facing: -45,
          action: "wave",
          look: -0.5,
          exprTimeline: [{ frame: 300, expr: "grin" }],
        },
      ],
    },
    {
      scene: "camp_dusk_to_night",
      frames: [495, 735],
      light: "golden",
      camera: { move: "crane", from: 0.0, to: 1.1, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-1.05, 0.18, 1.25],
          facing: 70,
          action: "camp_talk",
          exprTimeline: [
            { frame: 495, expr: "laugh" },
            { frame: 615, expr: "smile_closed" },
          ],
        },
        {
          actor: "leo",
          at: [1.05, 0.18, 1.25],
          facing: -70,
          action: "camp_sit",
          exprTimeline: [
            { frame: 495, expr: "grin" },
            { frame: 615, expr: "neutral" },
          ],
        },
      ],
    },
    {
      scene: "tent_wolf_howl",
      frames: [735, 975],
      light: "night",
      camera: { move: "push", from: 0.0, to: 0.55, ease: "smoother" },
      kick: 0.45, // Lands 2 frames before "howl" punch word
      dof: 3,
      cast: [
        {
          actor: "leo",
          at: [0.35, 0.08, -1.1],
          facing: -12,
          action: "wake_shock",
          shiver: 0.35,
          look: -0.6,
          exprTimeline: [
            { frame: 735, expr: "smile_closed" },
            { frame: 750, expr: "shock" }, // Snaps awake on wolf howl peak
            { frame: 890, expr: "fear" },
          ],
        },
      ],
    },
    {
      scene: "tent_zipper_cliffhanger",
      frames: [975, 1170],
      light: "night",
      camera: { move: "creep", speed: 0.22, ease: "linear" },
      kick: 0.30, // Lands 2 frames before "zipper" punch word
      dof: 2,
      cast: [
        {
          actor: "leo",
          at: [0.35, 0.08, -1.1],
          facing: -28, // Looking across at Sam's empty sleeping bag, then tent flap
          action: "tremble_fear",
          shiver: 0.85,
          look: -0.75,
          exprTimeline: [
            { frame: 975, expr: "nervous" },
            { frame: 1035, expr: "shock" }, // Sees empty sleeping bag
            { frame: 1102, expr: "fear" }, // Zipper starts sliding down
          ],
        },
      ],
    },
  ],
  audio: {
    voice: "audio/pinewood_part1_voice.mp3",
  },
};
