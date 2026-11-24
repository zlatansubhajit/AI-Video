// The generic manifest-driven episode renderer. One component renders any
// episode: camera grammar, light rig, sky, kit/glb/code/plate stage switching,
// cast layer, post chain and audio. No story names live here.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Episode as EpisodeManifest, GlbScene, LightName, PlateScene, Scene, Tier } from "../shot/types";
import { cameraPose, shotAt, validateEpisode } from "../shot/runtime";
import { KIT_PRESETS, KitStage } from "../kit/presets";
import { cloudField, placeSun, shadeSky, skyDome, sunSprites, updateClouds } from "../kit/primitives";
import { WeatherLayer } from "../kit/weather";
import { PlateStage, plateDelta, loadPlate } from "../plate/stage";
import { applyLight, createLightRig } from "../look/applyLight";
import { LIGHTS } from "../look/lights";
import { CastLayer } from "../cast/CastLayer";
import { PostChain, PostToggles } from "./PostChain";
import { CODE_STAGES } from "./registry";

export const tierForWidth = (width: number): Tier => (width <= 600 ? "draft" : width <= 900 ? "preview" : "final");

const sceneLight = (scene: Scene, shotLight?: LightName): LightName => shotLight ?? scene.light ?? "day";

const R3FTimer: React.FC<{ kind: string }> = ({ kind }) => {
  const frame = useCurrentFrame();
  const t0 = React.useRef(performance.now());
  React.useLayoutEffect(() => {
    t0.current = performance.now();
  });
  useEffect(() => {
    const dt = performance.now() - t0.current;
    if (frame % 5 === 0) {
      console.log(`[R3F] ${kind} frame=${frame} ms=${dt.toFixed(2)}`);
    }
  }, [frame, kind]);
  return null;
};

// ---------------- kit ----------------
const SceneStage: React.FC<{
  episode: EpisodeManifest;
  scene: Scene;
  shotIndex: number;
  frame: number;
  fps: number;
}> = ({ episode, scene, shotIndex, frame, fps }) => {
  const { camera, scene: threeScene } = useThree();
  const { width, height } = useVideoConfig();
  const cam = camera as THREE.PerspectiveCamera;
  const tier = tierForWidth(width);
  const shot = episode.shots[shotIndex];

  const rig = useMemo(() => createLightRig(tier === "final" ? "final" : "draft"), [tier]);
  const sky = useMemo(skyDome, []);
  const clouds = useMemo(cloudField, []);
  const sun = useMemo(sunSprites, []);

  // Build every kit set once; only the active one is visible, so a cut never
  // pays for geometry or texture painting.
  const kits = useMemo(() => {
    const m = new Map<string, KitStage>();
    for (const [name, s] of Object.entries(episode.scenes)) {
      if (s.kind !== "kit") continue;
      const preset = KIT_PRESETS[s.preset];
      if (!preset) throw new Error(`Episode "${episode.id}": unknown kit preset "${s.preset}" (scene "${name}")`);
      m.set(name, preset(s.weather ? { ...(s.options ?? {}), weather: s.weather } : s.options));
    }
    return m;
  }, [episode]);

  const pose = cameraPose(scene, shot, frame, fps);
  cam.position.copy(pose.position);
  cam.up.set(0, 1, 0);
  cam.lookAt(pose.target);
  cam.fov = pose.fov;
  cam.near = 0.2;
  cam.far = 1500;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  const light = sceneLight(scene, shot.light);
  const stageKey = scene.kind === "code" ? ((scene as any).stage ?? (scene as any).id ?? shot.scene) : null;
  const isCustomCodeStage = scene.kind === "code" && stageKey === "woodsCampPart1";

  if (!isCustomCodeStage) {
    threeScene.fog = rig.fog;
  }
  const sunDir = applyLight(rig, light, cam, pose.target, shot.sun ?? scene.sun);
  if (!isCustomCodeStage) {
    shadeSky(sky, light);
    sky.mesh.position.copy(cam.position);
    updateClouds(clouds, light, cam);
    placeSun(sun, cam, sunDir, LIGHTS[light], light);
  }

  for (const [name, st] of kits) st.root.visible = name === shot.scene;
  const active = kits.get(shot.scene);
  active?.update?.(frame / Math.max(1, fps));

  // camera forward for the DOF focus plane
  const viewDir = new THREE.Vector3();
  cam.getWorldDirection(viewDir);
  let focusTarget = pose.target;
  if (shot.cast && shot.cast.length > 0) {
    const mainActor = shot.cast[0];
    const dur = Math.max(1, shot.frames[1] - shot.frames[0]);
    const progress = Math.max(0, Math.min(1, (frame - shot.frames[0]) / dur));
    const ax = mainActor.to ? mainActor.at[0] + (mainActor.to[0] - mainActor.at[0]) * progress : mainActor.at[0];
    const ay = (mainActor.to ? mainActor.at[1] + (mainActor.to[1] - mainActor.at[1]) * progress : mainActor.at[1]) + 1.2;
    const az = mainActor.to ? mainActor.at[2] + (mainActor.to[2] - mainActor.at[2]) * progress : mainActor.at[2];
    focusTarget = new THREE.Vector3(ax, ay, az);
  }
  let focus = Math.max(0.3, focusTarget.clone().sub(cam.position).dot(viewDir));
  if (shot.focus != null) {
    focus = shot.focus;
  }

  const toggles = getInputProps() as { post?: PostToggles };
  const Code = stageKey ? CODE_STAGES[stageKey] : null;
  return (
    <>
      {!isCustomCodeStage && <primitive object={rig.group} dispose={null} />}
      {!isCustomCodeStage && <primitive object={sky.mesh} dispose={null} />}
      {!isCustomCodeStage && <primitive object={clouds.group} dispose={null} />}
      {!isCustomCodeStage && <primitive object={sun.disc} dispose={null} />}
      {!isCustomCodeStage && <primitive object={sun.halo} dispose={null} />}
      {[...kits.values()].map((st, i) => <primitive key={i} object={st.root} dispose={null} />)}
      {scene.kind === "glb" ? <GlbStage scene={scene} /> : null}
      {Code && scene.kind === "code" ? <Code scene={scene} episode={episode} /> : null}
      {shot.cast?.length ? <CastLayer cast={shot.cast} frame={frame} fps={fps} light={light} sun={sunDir} camera={cam} shotFrames={shot.frames} /> : null}
      {scene.kind === "kit" && scene.weather ? (
        <WeatherLayer
          weather={scene.weather}
          light={light}
          frame={frame}
          fps={fps}
          at={[pose.target.x, 0, pose.target.z]}
          height={height}
          wind={scene.wind}
        />
      ) : null}
      <PostChain
        scene={threeScene}
        camera={cam}
        light={light}
        dof={shot.dof ?? 0}
        focus={focus}
        tier={tier}
        toggles={toggles.post}
        world={active?.root ?? threeScene}
      />
      <R3FTimer kind="kit" />
    </>
  );
};

// ---------------- glb hero ----------------
const GlbStage: React.FC<{ scene: GlbScene }> = ({ scene }) => {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [handle] = useState(() => delayRender("glb " + scene.model));
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; continueRender(handle); } };
    new GLTFLoader().load(
      staticFile(scene.model),
      (g) => {
        const root = g.scene;
        root.scale.setScalar(scene.scale ?? 1);
        if (scene.position) root.position.set(...scene.position);
        if (scene.rotation) root.rotation.set(...scene.rotation);
        root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        setObj(root);
        finish();
      },
      undefined,
      () => finish(),
    );
    return finish;
  }, [scene.model, scene.scale, scene.position, scene.rotation, handle]);
  if (!obj) return null;
  return <primitive object={obj} dispose={null} />;
};

// ---------------- plate ----------------
// A plate shot is the baked background plus live cast. No kit, no sky, no ink,
// no DOF, no bloom: the colour plate already carries all of that. The quad
// reprojects the plate by depth so camera translation gives real parallax.
const PlateSceneStage: React.FC<{
  episode: EpisodeManifest;
  scene: PlateScene;
  shotIndex: number;
  frame: number;
  fps: number;
}> = ({ episode, scene, shotIndex, frame, fps }) => {
  const { camera, scene: threeScene } = useThree();
  const { width, height } = useVideoConfig();
  const cam = camera as THREE.PerspectiveCamera;
  const shot = episode.shots[shotIndex];
  const rig = useMemo(() => {
    const r = createLightRig("draft");
    r.sun.castShadow = false; // plates skip expensive world shadow maps
    return r;
  }, []);
  const delta = useMemo(() => new THREE.Vector3(), []);
  const pose = cameraPose(scene, shot, frame, fps);

  cam.position.copy(pose.position);
  cam.up.set(0, 1, 0);
  cam.lookAt(pose.target);
  cam.fov = pose.fov;
  cam.near = 0.2;
  cam.far = 1500;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  // the plate has its own fog and sky baked in; the rig only lights the cast
  threeScene.fog = null;
  const light = sceneLight(scene, shot.light);
  const sunDir = applyLight(rig, light, cam, pose.target, shot.sun ?? scene.sun);
  plateDelta(cam, scene.camera.position, scene.camera.target, delta);

  return (
    <>
      <primitive object={rig.group} dispose={null} />
      <PlateStage plate={scene.plate} delta={delta} fov={pose.fov} parallax={scene.parallax} aspect={width / height} />
      {shot.cast?.length ? <CastLayer cast={shot.cast} frame={frame} fps={fps} light={light} sun={sunDir} camera={cam} shotFrames={shot.frames} /> : null}
      <R3FTimer kind="plate" />
    </>
  );
};

// ---------------- episode ----------------
export const EpisodeVideo: React.FC<{ episode: EpisodeManifest }> = ({ episode }) => {
  useMemo(() => { validateEpisode(episode); }, [episode]);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const shot = shotAt(episode, frame);
  const scene = episode.scenes[shot.scene];
  const voice = episode.audio?.voice;
  const plate = scene.kind === "plate";

  useEffect(() => {
    for (const sc of Object.values(episode.scenes)) {
      if (sc.kind === "plate") {
        loadPlate(sc.plate);
      }
    }
  }, [episode]);

  return (
    <AbsoluteFill style={{ background: plate ? "#0b0b10" : "#cfe3f2" }}>
      {/* The composition size drives the WebGL buffer, so a 540x960 Draft
          really renders 540x960 (--scale alone does not; R3F clamps dpr >= 1). */}
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 1500 }}
      >
        {plate ? (
          <PlateSceneStage episode={episode} scene={scene} shotIndex={episode.shots.indexOf(shot)} frame={frame} fps={fps} />
        ) : (
          <SceneStage episode={episode} scene={scene} shotIndex={episode.shots.indexOf(shot)} frame={frame} fps={fps} />
        )}
      </ThreeCanvas>
      {voice ? <Audio src={staticFile(voice)} /> : null}
      {episode.endingCaption && frame >= episode.endingCaption.from ? (
        <div
          style={{
            position: "absolute",
            bottom: "12%",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: "14px 32px",
              borderRadius: 32,
              backgroundColor: "rgba(10, 18, 42, 0.88)",
              border: "3px solid #0B0E17",
              color: "#FFB300",
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 40,
              letterSpacing: "-0.01em",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {episode.endingCaption.text}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
