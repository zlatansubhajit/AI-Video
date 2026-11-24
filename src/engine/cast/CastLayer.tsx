// Thin React wrapper around CastStage: the stage owns the meshes, the wrapper
// just keeps it in the scene and ticks it once per rendered frame.
import React, { useMemo } from "react";
import * as THREE from "three";
import type { CastCall, LightName } from "../shot/types";
import { CastStage } from "./stage";

export const CastLayer: React.FC<{
  cast: CastCall[];
  frame: number;
  fps: number;
  light: LightName;
  sun: THREE.Vector3;
  camera: THREE.PerspectiveCamera;
  shotFrames?: [number, number];
}> = ({ cast, frame, fps, light, sun, camera, shotFrames }) => {
  const stage = useMemo(() => new CastStage(), []);
  stage.update(cast, frame, fps, camera, sun, light, shotFrames);
  return <primitive object={stage.root} dispose={null} />;
};
