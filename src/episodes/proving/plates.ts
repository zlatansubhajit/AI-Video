// Plates baked from the proving sets. The square is the Phase 4 gate: its
// capture camera is exactly the square scene's base pose, so the plate and the
// kit render line up frame for frame at the middle of a truck move.
import type { PlateDef } from "../../engine/plate/types";

export const PROVING_PLATES: PlateDef[] = [
  {
    id: "proving-square",
    spec: {
      preset: "city-square",
      light: "day",
      sun: { az: 165, el: 42 },
      camera: { position: [0, 1.9, 14], target: [0, 1.3, 7], fov: 40 },
    },
  },
];
