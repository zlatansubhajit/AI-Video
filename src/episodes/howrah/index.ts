import type { Episode } from "../../engine/shot/types";

export const howrah: Episode = {
  id: "howrah",
  title: "The Bridge That Opened in the Dark",
  fps: 30,
  frames: 2525,
  width: 1080,
  height: 1920,
  scenes: {
    river_night: {
      kind: "code",
      id: "howrah_river",
      light: "night",
      sun: { az: 165, el: 32 },
      camera: { position: [-36, 3.2, 48], target: [-42, 16.0, 0], fov: 46 },
    },
    bridge_tower: {
      kind: "code",
      id: "howrah_river",
      light: "night",
      sun: { az: 160, el: 35 },
      camera: { position: [-54, 7.5, 28], target: [-60, 24.0, 0], fov: 44 },
    },
    river_wide: {
      kind: "code",
      id: "howrah_river",
      light: "night",
      sun: { az: 165, el: 30 },
      camera: { position: [-18, 2.5, 42], target: [0.0, 8.5, 0], fov: 46 },
    },
    rivet_macro: {
      kind: "code",
      id: "howrah_rivet",
      light: "day",
      camera: { position: [0.0, 2.6, 4.4], target: [0.0, 2.5, 0.0], fov: 42 },
    },
    imagined_parade: {
      kind: "code",
      id: "howrah_deck",
      light: "day",
      camera: { position: [0.0, 1.9, 10], target: [0.0, 1.9, 0.0], fov: 44 },
    },
    deck_tram: {
      kind: "code",
      id: "howrah_deck",
      light: "night",
      sun: { az: 170, el: 35 },
      camera: { position: [1.2, 1.9, 14], target: [0.0, 2.0, 2.0], fov: 44 },
    },
    sky_bombers: {
      kind: "code",
      id: "howrah_air_raid",
      light: "night",
      sun: { az: 180, el: 40 },
      camera: { position: [0.0, 3.5, 16], target: [0.0, 15.0, -8.0], fov: 48 },
    },
    blackout_deck: {
      kind: "code",
      id: "howrah_deck",
      light: "night",
      sun: { az: 165, el: 35 },
      camera: { position: [0.0, 1.8, 8.5], target: [0.0, 1.7, 3.5], fov: 42 },
    },
    bridge_dawn: {
      kind: "code",
      id: "howrah_river",
      light: "day",
      camera: { position: [-30, 4.0, 48], target: [-38, 16.0, 0.0], fov: 46 },
    },
    river_night_strain: {
      kind: "code",
      id: "howrah_river",
      light: "night",
      sun: { az: 165, el: 32 },
      camera: { position: [-22, 5.0, 42], target: [0.0, 10.0, 0.0], fov: 46 },
    },
    riverbank_puzzle: {
      kind: "code",
      id: "howrah_seesaw",
      light: "day",
      camera: { position: [0.0, 2.2, 6.8], target: [0.0, 2.1, 0.0], fov: 42 },
    },
    seesaw_demo: {
      kind: "code",
      id: "howrah_seesaw",
      light: "golden",
      camera: { position: [0.0, 2.4, 6.8], target: [0.0, 2.2, 0.0], fov: 42 },
    },
    cantilever_anchors: {
      kind: "code",
      id: "howrah_river",
      light: "golden",
      camera: { position: [-64, 5.5, 34], target: [-80, 8.0, 0.0], fov: 44 },
    },
    bridge_golden: {
      kind: "code",
      id: "howrah_river",
      light: "golden",
      camera: { position: [-32, 4.5, 48], target: [-38, 16.0, 0.0], fov: 46 },
    },
    crowded_day: {
      kind: "code",
      id: "howrah_deck",
      light: "day",
      camera: { position: [0.0, 1.9, 12], target: [0.0, 1.9, 0.0], fov: 44 },
    },
  },
  shots: [
    // Shot 1: Midnight Hook (4.23s) - Total silence in the middle of the night
    {
      scene: "river_night",
      frames: [0, 127],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 2.5 },
      dof: 0.0,
      cast: [
        { actor: "babu", at: [-0.4, 0.45, 32], facing: -35, action: "idle" },
      ],
    },
    // Shot 2: Steel Monster (8.53s) - 26,500-ton steel monster finished across the Hooghly
    {
      scene: "bridge_tower",
      frames: [127, 383],
      camera: { move: "crane", ease: "smoother", from: 0.0, to: 2.8 },
      dof: 0.0,
      kick: 0.35,
      cast: [
        { actor: "worker", at: [-55.2, 7.5, 19], facing: -45, action: "work" },
        { actor: "babu", at: [-53.8, 7.5, 18], facing: -50, action: "babu_smart" },
      ],
    },
    // Shot 3: Zero Pillars (6.93s) - 1,500 feet with zero pillars in the riverbed
    {
      scene: "river_wide",
      frames: [383, 591],
      camera: { move: "truck", ease: "smoother", from: -0.5, to: 0.8 },
      dof: 0.0,
      cast: [
        { actor: "babu", at: [-0.5, 0.45, 30], facing: 30, action: "babu_smart" },
        { actor: "chintu", at: [0.5, 0.45, 31], facing: -20, action: "chintu_phone" },
      ],
    },
    // Shot 4: Rivets Only (5.80s) - Entire skeleton riveted, not a single nut or bolt
    {
      scene: "rivet_macro",
      frames: [591, 765],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 2.2 },
      dof: 4.0,
      kick: 0.4,
      cast: [
        { actor: "worker", at: [0.75, 0.0, 2.0], facing: -55, action: "work" },
      ],
    },
    // Shot 5: Brass Parade (5.67s) - Brass bands, speeches, and a massive parade
    {
      scene: "imagined_parade",
      frames: [765, 935],
      camera: { move: "truck", ease: "smoother", from: -0.4, to: 0.6 },
      dof: 4.0,
      cast: [
        { actor: "clerk", at: [-0.7, 0.75, 5.0], facing: 20, action: "cheer" },
        { actor: "musician", at: [0.6, 0.75, 5.2], facing: -25, action: "cheer" },
        { actor: "kid", at: [1.1, 0.75, 6.0], facing: -35, action: "wave" },
      ],
    },
    // Shot 6: Lonely Tram (5.83s) - One lonely tram rolling through the dark
    {
      scene: "deck_tram",
      frames: [935, 1110],
      camera: { move: "creep", speed: 0.35, ease: "linear" },
      dof: 0.0,
      kick: 0.3,
      cast: [
        { actor: "babu", at: [1.2, 0.75, 8.5], facing: -45, action: "idle" },
      ],
    },
    // Shot 7: Air Raid (5.23s) - WWII Japanese bombers hitting the city
    {
      scene: "sky_bombers",
      frames: [1110, 1267],
      camera: { move: "crane", ease: "smoother", from: 0.0, to: 3.0 },
      dof: 0.0,
      kick: 0.42,
      cast: [
        { actor: "officer", at: [-0.6, -0.2, 9.5], facing: 25, action: "shock" },
        { actor: "babu", at: [0.6, -0.2, 9.8], facing: -20, action: "shock" },
      ],
    },
    // Shot 8: Terrified Officials (6.10s) - Terrified daytime crowds would make an easy target
    {
      scene: "blackout_deck",
      frames: [1267, 1450],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 2.0 },
      dof: 4.0,
      cast: [
        { actor: "officer", at: [-0.55, 0.75, 4.8], facing: 20, action: "shock" },
        { actor: "clerk", at: [0.55, 0.75, 4.8], facing: -20, action: "shock" },
      ],
    },
    // Shot 9: Bombers Miss (3.17s) - Luckily, the bombers never took it down
    {
      scene: "bridge_dawn",
      frames: [1450, 1545],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 1.5 },
      dof: 0.0,
      kick: 0.25,
      cast: [
        { actor: "babu", at: [-0.45, 0.45, 30], facing: 15, action: "babu_smart" },
        { actor: "chintu", at: [0.45, 0.45, 31], facing: -20, action: "chintu_snicker" },
      ],
    },
    // Shot 10: Gravity Fight (5.07s) - Unluckily, fighting gravity every second
    {
      scene: "river_night_strain",
      frames: [1545, 1697],
      camera: { move: "truck", ease: "smoother", from: 0.4, to: -0.4 },
      dof: 0.0,
      kick: 0.4,
      cast: [
        { actor: "worker", at: [-0.5, 0.45, 26], facing: 30, action: "work" },
      ],
    },
    // Shot 11: Cantilever Mystery (4.93s) - How does a bridge that heavy hang over a river?
    {
      scene: "riverbank_puzzle",
      frames: [1697, 1845],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 2.2 },
      dof: 4.0,
      cast: [
        { actor: "babu", at: [-0.65, 1.4, 2.8], facing: 25, action: "babu_smart" },
        { actor: "chintu", at: [0.65, 1.4, 2.8], facing: -25, action: "chintu_phone" },
      ],
    },
    // Shot 12: Seesaw Balance (5.77s) - Back-to-back on a seesaw, leaning outward
    {
      scene: "seesaw_demo",
      frames: [1845, 2018],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 2.5 },
      dof: 3.0,
      kick: 0.35,
      cast: [
        { actor: "babu", at: [-0.6, 1.4, 2.6], facing: 35, action: "babu_lean" },
        { actor: "worker", at: [0.6, 1.4, 2.6], facing: -35, action: "carry" },
      ],
    },
    // Shot 13: Anchor Arms (5.10s) - Anchors deep into riverbanks to hold middle in the sky
    {
      scene: "cantilever_anchors",
      frames: [2018, 2171],
      camera: { move: "crane", ease: "smoother", from: 0.0, to: 3.2 },
      dof: 0.0,
      kick: 0.3,
      cast: [
        { actor: "babu", at: [-62, 7.5, 20], facing: -45, action: "point" },
      ],
    },
    // Shot 14: War Survivor (5.90s) - Survived the war, busiest cantilever on the planet
    {
      scene: "bridge_golden",
      frames: [2171, 2348],
      camera: { move: "truck", ease: "smoother", from: -0.6, to: 0.6 },
      dof: 0.0,
      cast: [
        { actor: "babu", at: [-0.45, 0.45, 30], facing: 15, action: "babu_smart" },
        { actor: "chintu", at: [0.45, 0.45, 31], facing: -20, action: "chintu_snicker" },
      ],
    },
    // Shot 15: Crowds Today (5.90s) - Carries hundreds of thousands every single day
    {
      scene: "crowded_day",
      frames: [2348, 2525],
      camera: { move: "push", ease: "smoother", from: 0.0, to: 3.0 },
      dof: 3.0,
      cast: [
        { actor: "babu", at: [-0.48, 0.75, 4.2], facing: 15, action: "babu_smart" },
        { actor: "chintu", at: [0.48, 0.75, 4.5], facing: -15, action: "chintu_stroll" },
        { actor: "woman", at: [-0.95, 0.75, 6.8], facing: 180, action: "walk" },
        { actor: "kid", at: [0.95, 0.75, 7.2], facing: 180, action: "stroll" },
      ],
    },
  ],
  audio: {
    voice: "audio/howrah_voice.mp3",
  },
};
