// Weather kit proof: two 3 s shots, rain over the city square and snow in the
// park. Nothing here is story-specific; it exists to verify the precipitation
// layer and the `overcast` light against the shared kit.
import type { Episode } from "../../engine/shot/types";

export const weatherKit: Episode = {
  id: "weather-kit",
  title: "Kit: rain and snow",
  fps: 30,
  frames: 180,
  scenes: {
    rain: {
      kind: "kit",
      preset: "city-square",
      light: "overcast",
      weather: "rain",
      wind: 0.6,
      sun: { az: 165, el: 42 },
      camera: { position: [2.6, 1.55, 13], target: [0, 1.35, 7], fov: 42 },
    },
    snow: {
      kind: "kit",
      preset: "park-lawn",
      light: "overcast",
      weather: "snow",
      wind: 0.25,
      camera: { position: [5.2, 1.7, 8.4], target: [0, 1.2, 0], fov: 38 },
    },
  },
  shots: [
    {
      scene: "rain",
      frames: [0, 90],
      camera: { move: "crane", from: 0, to: 1.3, ease: "smooth" },
      dof: 10,
      cast: [{ actor: "worker", at: [0, 0, 8], action: "idle" }],
    },
    {
      scene: "snow",
      frames: [90, 180],
      camera: { move: "orbit", from: -12, to: 12, ease: "smoother" },
      dof: 10,
      cast: [{ actor: "worker", at: [0.4, 0, 0], action: "idle_smile" }],
    },
  ],
};
