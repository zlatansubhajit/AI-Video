// Phase 4 gate: the same 3 s camera move rendered twice, once from the live
// kit and once from a baked plate with depth parallax. Both halves share the
// camera, light, sun and cast, so the cut is an A/B comparison and the wall
// time difference is the plate speed-up.
import type { Episode } from "../../engine/shot/types";

export const plateKit: Episode = {
  id: "plate-kit",
  title: "Kit vs plate (phase 4)",
  fps: 30,
  frames: 180,
  scenes: {
    kit: {
      kind: "kit",
      preset: "city-square",
      light: "day",
      sun: { az: 165, el: 42 },
      camera: { position: [0, 1.9, 14], target: [0, 1.3, 7], fov: 40 },
    },
    plate: {
      kind: "plate",
      plate: "plates/proving-square",
      light: "day",
      sun: { az: 165, el: 42 },
      camera: { position: [0, 1.9, 14], target: [0, 1.3, 7], fov: 40 },
    },
  },
  shots: [
    {
      scene: "kit",
      frames: [0, 90],
      camera: { move: "truck", from: -0.5, to: 0.5, ease: "smooth" },
      dof: 12,
      cast: [{ actor: "worker", at: [0, 0, 8], action: "idle" }],
    },
    {
      scene: "plate",
      frames: [90, 180],
      camera: { move: "truck", from: -0.5, to: 0.5, ease: "smooth" },
      cast: [{ actor: "worker", at: [0, 0, 8], action: "idle" }],
    },
  ],
};
