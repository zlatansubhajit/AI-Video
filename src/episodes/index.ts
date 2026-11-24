// Every manifest episode in the repo. Root.tsx registers each one twice:
// final (1080x1920) and draft (540x960). Plates are capture-only compositions
// plus the file names that runtime plate scenes load from `public/plates`.
import type { Episode } from "../engine/shot/types";
import type { PlateDef } from "../engine/plate/types";
import { proving } from "./proving";
import { PROVING_PLATES } from "./proving/plates";
import { plateKit } from "./plate-kit";
import { weatherKit } from "./weather-kit";
import { hikingNight } from "./hiking_night";
import { howrah } from "./howrah";
import { pinewoodNight1 } from "./pinewood_night_1";
import { pinewoodPart1 } from "./pinewood_part1";
import { shawshankHope } from "./shawshank_hope";

export const EPISODES: Episode[] = [proving, weatherKit, plateKit, hikingNight, howrah, pinewoodNight1, pinewoodPart1, shawshankHope];

export const PLATES: PlateDef[] = [...PROVING_PLATES];
