import type { Episode } from "../../engine/shot/types";

export const pinewoodNight1: Episode = {
  id: "pinewood-night-1",
  title: "Part 1: The Sound After The Fire",
  fps: 30,
  frames: 1170, // 39.0 seconds @ 30 fps
  width: 1080,
  height: 1920,
  endingCaption: {
    from: 1140, // 38.0s - 39.0s cliffhanger text
    text: "Part 2 is already up ->",
  },
  scenes: {
    fire_die: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "fire_die" },
      light: "night",
      camera: { position: [-0.2, 0.45, 3.8], target: [-0.2, 0.22, 2.2], fov: 34 },
    },
    trail_hike: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "trail" },
      light: "day",
      camera: { position: [-1.2, 1.8, 16.5], target: [0.0, 1.1, 10.5], fov: 44 },
    },
    pup_rescue: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "pup_rescue" },
      light: "day",
      camera: { position: [0.35, 1.25, 8.4], target: [0.0, 0.55, 6.0], fov: 40 },
    },
    camp_sunset: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "camp_sunset" },
      light: "golden",
      camera: { position: [0.0, 1.8, 7.2], target: [0.0, 1.0, 0.5], fov: 44 },
    },
    howl_wake: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "tent_wolf" },
      light: "night",
      camera: { position: [0.2, 1.3, 2.8], target: [0.2, 0.8, -1.0], fov: 38 },
    },
    empty_zipper: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "tent_zipper" },
      light: "night",
      camera: { position: [-0.15, 1.15, 2.3], target: [-0.2, 0.65, -1.0], fov: 40 },
    },
  },
  shots: [
    // Shot 1: Dying Fire Warning (3.6s) - Extreme close-up on campfire pit, cold embers
    {
      scene: "fire_die",
      frames: [0, 108],
      camera: { move: "push", from: 0.0, to: -0.6, ease: "smoother" },
      dof: 0,
      cast: [],
    },
    // Shot 2: Day Trek Laughs (5.5s) - Dynamic hike along trail, crystal clear
    {
      scene: "trail_hike",
      frames: [108, 273],
      camera: { move: "truck", from: -0.8, to: 0.8, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.65, 0.01, 16.0],
          to: [-0.65, 0.01, 10.5],
          facing: 180,
          action: "hike",
          ease: "linear",
        },
        {
          actor: "leo",
          at: [0.65, 0.01, 15.2],
          to: [0.65, 0.01, 9.7],
          facing: 180,
          action: "hike",
          actionOffset: 0.35,
          ease: "linear",
        },
      ],
    },
    // Shot 3: Freeing the Pup (6.03s) - Leo kneels, freeing tiny wolf pup with white tuft
    {
      scene: "pup_rescue",
      frames: [273, 454],
      camera: { move: "push", from: 0.0, to: 0.6, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "leo",
          at: [0.55, 0.01, 6.0],
          facing: -65,
          action: "kneel_gentle",
        },
        {
          actor: "pup",
          at: [-0.15, 0.01, 6.0],
          to: [-1.6, 0.01, 4.8],
          facing: 65,
          action: "pup_free_hop",
          ease: "out",
        },
      ],
    },
    // Shot 4: Sunset Campfire (6.97s) - Pitching tent, warm evening banter before fire dies out
    {
      scene: "camp_sunset",
      frames: [454, 663],
      camera: { move: "push", from: 0.0, to: 0.8, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-1.6, 0.16, 2.2],
          facing: 70,
          action: "camp_talk",
        },
        {
          actor: "leo",
          at: [1.3, 0.16, 2.2],
          facing: -70,
          action: "camp_sit",
        },
      ],
    },
    // Shot 5: 2:14 AM Howl Shock (8.9s) - Leo violently springs awake on wolf howl!
    {
      scene: "howl_wake",
      frames: [663, 930],
      camera: { move: "push", from: 0.0, to: 0.65, ease: "smoother" },
      dof: 0,
      kick: 0.45,
      cast: [
        {
          actor: "sam",
          at: [-0.35, 0.08, -1.0],
          facing: 10,
          action: "sleep_tent",
        },
        {
          actor: "leo",
          at: [0.45, 0.08, -1.0],
          facing: -15,
          action: "sleep_tent",
          exprTimeline: [
            [0, "neutral"],
            [0.25, "shock"],
            [0.65, "fear"],
          ],
          shiver: 0.8,
        },
      ],
    },
    // Shot 6: Empty Sleeping Bag & Moving Zipper (8.0s) - Cliffhanger ending!
    {
      scene: "empty_zipper",
      frames: [930, 1170],
      camera: { move: "push", from: 0.0, to: 0.7, ease: "smoother" },
      dof: 0,
      kick: 0.25,
      cast: [
        {
          actor: "leo",
          at: [0.45, 0.08, -1.0],
          facing: -80,
          action: "look_empty",
          shiver: 1.0,
          exprTimeline: [
            [0, "shock"],
            [0.35, "fear"],
          ],
        },
      ],
    },
  ],
  audio: {
    voice: "audio/pinewood_night_1_voice.mp3",
  },
};
