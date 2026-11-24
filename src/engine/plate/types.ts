// Plate capture spec. Plain data: it names a kit preset and the exact camera a
// plate was baked from, so the depth pass and the colour pass agree.
import type { CameraBase, LightName, SunOverride, WeatherName } from "../shot/types";

export type PlateSpec = {
  preset: string;
  options?: Record<string, unknown>;
  light?: LightName;
  sun?: SunOverride;
  /** Optional weather baked into the plate (precipitation is NOT baked; only
   *  the ground treatment is, so a static plate never freezes rain). */
  weather?: WeatherName;
  camera: CameraBase;
};

/** One plate in the repository: `id` becomes the file name and composition id
 *  suffix, `spec` is what the capture passes render. */
export type PlateDef = {
  id: string;
  spec: PlateSpec;
};

/** Capture size. 2x the final 1080x1920 frame leaves headroom for parallax. */
export const PLATE_WIDTH = 2160;
export const PLATE_HEIGHT = 3840;

/** Log-depth range shared by the capture shader and the runtime parallax
 *  stage. Log encoding keeps precision at street distances; reciprocal depth
 *  (1/near - 1/z) saturates within a few metres and quantises a 7 m wall and a
 *  9 m wall to the same 8-bit value. */
export const DEPTH_NEAR = 0.5;
export const DEPTH_FAR = 400;
