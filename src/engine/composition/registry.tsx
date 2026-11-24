// Escape hatch: a code scene looks up a hand-written three.js stage here.
// Reserved for the rare shot the kit, a plate or a GLB cannot build.
import React, { useEffect, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import type { CodeScene, Episode } from "../shot/types";
import { HowrahRiverStage } from "../../episodes/howrah/stages/HowrahRiverStage";
import { HowrahDeckStage } from "../../episodes/howrah/stages/HowrahDeckStage";
import { HowrahRivetStage } from "../../episodes/howrah/stages/HowrahRivetStage";
import { HowrahAirRaidStage } from "../../episodes/howrah/stages/HowrahAirRaidStage";
import { HowrahSeesawStage } from "../../episodes/howrah/stages/HowrahSeesawStage";
import { buildPart1Scene, Part1SceneMode } from "../kit/woodsCampPart1";
import { ShawshankStage } from "../../episodes/shawshank_hope/stage";

export type CodeStageProps = { scene: CodeScene; episode: Episode };

export const WoodsCampPart1Stage: React.FC<CodeStageProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mode = (scene.options?.mode as Part1SceneMode) ?? "ember_cold_open";
  const built = useMemo(() => buildPart1Scene(mode), [mode]);

  useEffect(() => {
    return () => {
      built.dispose();
    };
  }, [built]);

  const { scene: threeScene } = useThree();
  useEffect(() => {
    if (built.scene.fog) {
      threeScene.fog = built.scene.fog;
    }
  }, [built, threeScene]);

  built.update(frame, fps);

  return <primitive object={built.scene} />;
};

export const CODE_STAGES: Record<string, React.FC<CodeStageProps>> = {
  howrah_river: () => <HowrahRiverStage />,
  howrah_deck: () => <HowrahDeckStage />,
  howrah_rivet: () => <HowrahRivetStage />,
  howrah_air_raid: () => <HowrahAirRaidStage />,
  howrah_seesaw: () => <HowrahSeesawStage />,
  woodsCampPart1: (props) => <WoodsCampPart1Stage {...props} />,
  shawshank: (props) => <ShawshankStage {...props} />,
  ember_cold_open: (props) => <WoodsCampPart1Stage {...props} />,
  trail_day: (props) => <WoodsCampPart1Stage {...props} />,
  pup_rescue: (props) => <WoodsCampPart1Stage {...props} />,
  camp_dusk_to_night: (props) => <WoodsCampPart1Stage {...props} />,
  tent_wolf_howl: (props) => <WoodsCampPart1Stage {...props} />,
  tent_zipper_cliffhanger: (props) => <WoodsCampPart1Stage {...props} />,
};
