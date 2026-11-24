import type { Episode } from "../../engine/shot/types";

export const hikingNight: Episode = {
  id: "hiking-night",
  title: "The Midnight Howl in the Pine Woods",
  fps: 30,
  frames: 889,
  width: 1080,
  height: 1920,
  scenes: {
    trail_day: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "trail" },
      light: "day",
      camera: { position: [0.6, 1.8, 18], target: [0, 1.1, 10], fov: 44 },
    },
    trail_sunset: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "trail_sunset" },
      light: "golden",
      camera: { position: [-1.8, 1.7, 13.5], target: [0, 1.1, 7.5], fov: 42 },
    },
    camp_fire: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "camp_fire" },
      light: "night",
      camera: { position: [0.0, 1.7, 7.0], target: [0.0, 1.0, 0.5], fov: 44 },
    },
    tent_sleep: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "tent_sleep" },
      light: "night",
      camera: { position: [0.1, 1.4, 3.8], target: [0.1, 0.8, -1.0], fov: 42 },
    },
    wolf_howl: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "tent_wolf" },
      light: "night",
      camera: { position: [0.0, 1.3, 2.8], target: [-0.05, 0.8, -1.0], fov: 40 },
    },
    fear_tremble: {
      kind: "kit",
      preset: "woods-camp",
      options: { mode: "fear_cu" },
      light: "night",
      camera: { position: [-0.15, 1.2, 1.6], target: [-0.15, 0.8, -1.0], fov: 42 },
    },
  },
  shots: [
    // Shot 1: Trek Day (4.8s) - Friends walking dynamically along the trail, crystal clear and sharp
    {
      scene: "trail_day",
      frames: [0, 144],
      camera: { move: "push", from: 0.0, to: 1.8, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.65, 0.01, 15.0],
          to: [-0.65, 0.01, 11.2],
          facing: 180,
          action: "hike",
          ease: "linear",
        },
        {
          actor: "leo",
          at: [0.65, 0.01, 14.2],
          to: [0.65, 0.01, 10.4],
          facing: 180,
          action: "hike",
          actionOffset: 0.35,
          ease: "linear",
        },
      ],
    },
    // Shot 2: Trek Sunset (5.27s) - Tired trek under warm golden light, distinct trail & shadows
    {
      scene: "trail_sunset",
      frames: [144, 302],
      light: "golden",
      camera: { move: "truck", from: -0.4, to: 0.6, ease: "smoother" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.55, 0.01, 10.2],
          to: [-0.55, 0.01, 7.2],
          facing: 180,
          action: "hike_tired",
          ease: "linear",
        },
        {
          actor: "leo",
          at: [0.6, 0.01, 9.4],
          to: [0.6, 0.01, 6.4],
          facing: 180,
          action: "hike_tired",
          actionOffset: 0.25,
          ease: "linear",
        },
      ],
    },
    // Shot 3: Campfire Under The Stars (5.03s) - Cozy evening by the fire with tent clearly in sight
    {
      scene: "camp_fire",
      frames: [302, 453],
      light: "night",
      camera: { move: "push", from: 0.0, to: 1.2, ease: "smoother" },
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
    // Shot 4: Fire Out, Fast Asleep (4.77s) - Atmospheric medium shot of tent and sleeping friends
    {
      scene: "tent_sleep",
      frames: [453, 596],
      light: "night",
      camera: { move: "creep", speed: 0.12, ease: "linear" },
      dof: 0,
      cast: [
        {
          actor: "sam",
          at: [-0.15, 0.08, -1.0],
          facing: 10,
          action: "sleep_tent",
        },
        {
          actor: "leo",
          at: [0.55, 0.08, -1.0],
          facing: -15,
          action: "sleep_tent",
          actionOffset: 0.8,
        },
      ],
    },
    // Shot 5: Wolf Howl Shock (4.07s) - Wolf howl echoes; Sam jolts awake inside the tent
    {
      scene: "wolf_howl",
      frames: [596, 718],
      light: "night",
      camera: { move: "push", from: 0.0, to: 0.6, ease: "smoother" },
      dof: 0,
      kick: 0.35,
      cast: [
        {
          actor: "sam",
          at: [-0.15, 0.08, -1.0],
          facing: 15,
          action: "wake_shock",
          look: 0.4,
          exprTimeline: [
            [0, "neutral"],
            [0.2, "shock"],
            [0.6, "fear"],
          ],
        },
        {
          actor: "leo",
          at: [0.55, 0.08, -1.0],
          facing: -15,
          action: "sleep_tent",
        },
      ],
    },
    // Shot 6: Shivering in Terror (5.7s) - Medium close-up of Sam trembling in fear, perfectly framed
    {
      scene: "fear_tremble",
      frames: [718, 889],
      light: "night",
      camera: { move: "creep", speed: 0.06, ease: "linear" },
      dof: 0,
      kick: 0.1,
      cast: [
        {
          actor: "sam",
          at: [-0.15, 0.08, -1.0],
          facing: 10,
          action: "tremble_fear",
          shiver: 1.0,
          look: -0.3,
          exprTimeline: [
            [0, "fear"],
            [0.4, "shock"],
            [0.7, "fear"],
          ],
        },
      ],
    },
  ],
  audio: {
    voice: "audio/hiking_night_voice.mp3",
  },
};
