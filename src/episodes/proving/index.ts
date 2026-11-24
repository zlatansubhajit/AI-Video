// Phase 2 proving episode: 15 s, six shots, one character, three kit sets.
// Purpose is architectural only: this manifest exercises every camera move,
// two light presets, three presets and the generic Episode renderer.
import type { Episode } from "../../engine/shot/types";

export const proving: Episode = {
  id: "proving",
  title: "Proving Ground (manifest phase 2)",
  fps: 30,
  frames: 450,
  scenes: {
    park: {
      kind: "kit",
      preset: "park-lawn",
      light: "day",
      camera: { position: [5.2, 1.55, 8.0], target: [0, 1.35, 0], fov: 38 },
    },
    river: {
      kind: "kit",
      preset: "riverside",
      light: "golden",
      camera: { position: [17.5, 4.2, 11], target: [11.6, 1.0, -2], fov: 38 },
    },
    square: {
      kind: "kit",
      preset: "city-square",
      light: "day",
      sun: { az: 165, el: 42 },
      camera: { position: [0, 1.9, 14], target: [0, 1.3, 7], fov: 40 },
    },
  },
  shots: [
    {
      scene: "park",
      frames: [0, 80],
      camera: { move: "push", from: 0, to: 2.2, ease: "smoother" },
      dof: 12,
      cast: [{ actor: "worker", at: [0.4, 0, 0], action: "idle" }],
    },
    {
      scene: "park",
      frames: [80, 150],
      camera: { move: "pan", from: -5, to: 5, ease: "smooth" },
      dof: 8,
      cast: [{ actor: "worker", at: [0.4, 0, 0], action: "work" }],
    },
    {
      scene: "river",
      frames: [150, 230],
      camera: { move: "truck", from: -2, to: 3, ease: "smooth" },
      dof: 14,
      cast: [{ actor: "worker", at: [12.6, 0, -1], action: "idle_smile" }],
    },
    {
      scene: "river",
      frames: [230, 310],
      camera: { move: "orbit", from: -16, to: 16, ease: "smoother" },
      dof: 10,
      cast: [{ actor: "worker", at: [12.6, 0, -1], action: "point" }],
    },
    {
      scene: "square",
      frames: [310, 390],
      camera: { move: "crane", from: 0, to: 2.2, ease: "smooth" },
      dof: 9,
      cast: [{ actor: "worker", at: [0, 0, 8], action: "wave" }],
    },
    {
      scene: "square",
      frames: [390, 450],
      camera: { move: "creep", speed: 0.55, ease: "linear" },
      dof: 16,
      cast: [{ actor: "worker", at: [0, 0, 8], action: "idle" }],
    },
  ],
};
