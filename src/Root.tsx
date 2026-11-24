import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { DancingBridgeShort, DANCING_BRIDGE_FRAMES } from "./episodes/bridge/Bridge";
import { DancingBridgeFast, FAST_TOTAL_FRAMES } from "./episodes/bridge/BridgeFast";
import { EPISODES, PLATES } from "./episodes";
import { EpisodeVideo } from "./engine/composition/Episode";
import { PlateCapture, PlateDepth } from "./engine/plate/capture";
import { PLATE_HEIGHT, PLATE_WIDTH } from "./engine/plate/types";

export const Root: React.FC = () => {
  return (
    <>
      {/* 15-second fast edition: 450 frames (~2-5 min render) */}
      <Composition
        id="DancingBridgeFast"
        component={DancingBridgeFast}
        durationInFrames={FAST_TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Full 67-second story edition: 2025 frames */}
      <Composition
        id="DancingBridgeShort"
        component={DancingBridgeShort}
        durationInFrames={DANCING_BRIDGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Real draft tiers: the composition size drives the WebGL buffer. */}
      <Composition
        id="DancingBridgeDraft"
        component={DancingBridgeShort}
        durationInFrames={DANCING_BRIDGE_FRAMES}
        fps={30}
        width={540}
        height={960}
      />
      <Composition
        id="DancingBridgeFastDraft"
        component={DancingBridgeFast}
        durationInFrames={FAST_TOTAL_FRAMES}
        fps={30}
        width={540}
        height={960}
      />
      <Composition
        id="BridgeShort"
        component={BridgeShort}
        durationInFrames={BRIDGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Manifest episodes: add a folder under src/episodes and it appears here. */}
      {EPISODES.map((ep) => (
        <React.Fragment key={ep.id}>
          <Composition
            id={ep.id}
            component={EpisodeVideo}
            durationInFrames={ep.frames}
            fps={ep.fps ?? 30}
            width={ep.width ?? 1080}
            height={ep.height ?? 1920}
            defaultProps={{ episode: ep }}
          />
          <Composition
            id={`${ep.id}Draft`}
            component={EpisodeVideo}
            durationInFrames={ep.frames}
            fps={ep.fps ?? 30}
            width={540}
            height={960}
            defaultProps={{ episode: ep }}
          />
        </React.Fragment>
      ))}
      {/* Plate captures: colour through the normal renderer, depth through an
          override material. scripts/plates.mjs writes both into public/plates. */}
      {PLATES.map((p) => (
        <React.Fragment key={p.id}>
          <Composition
            id={`plate-${p.id}-color`}
            component={PlateCapture}
            durationInFrames={1}
            fps={30}
            width={PLATE_WIDTH}
            height={PLATE_HEIGHT}
            defaultProps={{ spec: p.spec }}
          />
          <Composition
            id={`plate-${p.id}-depth`}
            component={PlateDepth}
            durationInFrames={1}
            fps={30}
            width={PLATE_WIDTH}
            height={PLATE_HEIGHT}
            defaultProps={{ spec: p.spec }}
          />
        </React.Fragment>
      ))}
    </>
  );
};
