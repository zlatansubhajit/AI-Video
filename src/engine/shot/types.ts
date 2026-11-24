// The episode contract. Everything in this file is plain data: an episode can
// be serialized into Remotion's defaultProps and contains no React or three.js.
export type Vec3 = [number, number, number];

/** Render quality tier. Drives resolution at the composition level and the
 *  post-chain cost inside the engine. */
export type Tier = "draft" | "preview" | "final";

/** Light presets the look was tuned against. `overcast` exists for weather scenes, `night` for nocturnal scenes. */
export type LightName = "day" | "golden" | "overcast" | "night";

/** Precipitation the kit can render for any scene. */
export type WeatherName = "rain" | "snow";

export type EaseName = "linear" | "smooth" | "smoother" | "in" | "out";

export type MoveKind = "push" | "pan" | "truck" | "crane" | "orbit" | "creep";

export type CameraMove = {
  move: MoveKind;
  /** push: metres along the view axis. pan/orbit: degrees. truck/crane: metres. */
  from?: number;
  to?: number;
  /** orbit only: radius from the target. Without it the base offset is rotated. */
  radius?: number;
  /** orbit only: absolute height above the target. */
  height?: number;
  /** creep: metres per second. */
  speed?: number;
  ease?: EaseName;
};

export type CameraBase = {
  position: Vec3;
  target: Vec3;
  fov?: number;
};

export type CastCall = {
  /** Key in the cast library (`worker`, `clerk`, `kid`, `soldier`, ...). */
  actor: string;
  /** Feet position in world space. When `to` is provided, `at` is the starting point. */
  at: Vec3;
  /** Optional destination point for animated movement across the shot duration. */
  to?: Vec3;
  ease?: EaseName;
  /** Degrees; 0 = facing +Z. Only affects card mirroring for now. */
  facing?: number;
  /** Key in the action library (`idle`, `walk`, `work`, ...). */
  action?: string;
  /** Seconds added to the episode clock for this actor. */
  actionOffset?: number;
  scale?: number;
  /** Expression override, e.g. `shock`. */
  expr?: string;
  /** Dynamic expression transitions within shot: array of [shotProgress 0..1, Expr] or { frame: number, expr: string }. */
  exprTimeline?: ([number, string] | { frame: number; expr: string })[];
  /** Shiver / tremble intensity (0..1) for fear or cold (adds jitter). */
  shiver?: number;
  /** Look direction override (-1 left, 0 center, 1 right). */
  look?: number;
};

/** Camera-relative sun override (degrees from the shot's forward axis / elevation). */
export type SunOverride = { az?: number; el?: number };

type SceneBase = {
  light?: LightName;
  /** Default camera pose for shots in this scene. A shot's move is applied on top. */
  camera: CameraBase;
  /** Optional sun direction override for this scene, e.g. front-lit facades. */
  sun?: SunOverride;
};

export type KitScene = SceneBase & {
  kind: "kit";
  /** Key in the kit preset registry (`park-lawn`, `riverside`, ...). */
  preset: string;
  /** Precipitation layer + a matching ground treatment (wet / settled snow). */
  weather?: WeatherName;
  /** Wind strength (0 = still, 1 = gusty): slants rain and drives snow sideways. */
  wind?: number;
  options?: Record<string, unknown>;
};

export type PlateScene = SceneBase & {
  kind: "plate";
  /** Public path without the `.base.png` suffix. */
  plate: string;
  /** Depth parallax strength; 1 = full camera translation. */
  parallax?: number;
  /** Apply toon color grade matching the light preset (useful for raw AI plates). */
  grade?: boolean;
};

export type GlbScene = SceneBase & {
  kind: "glb";
  /** Public path to the optimized GLB. */
  model: string;
  scale?: number;
  position?: Vec3;
  rotation?: Vec3;
};

/** Rare escape hatch: `id` or `stage` is looked up in a code-stage registry. */
export type CodeScene = SceneBase & {
  kind: "code";
  id?: string;
  stage?: string;
  options?: Record<string, unknown>;
};

export type Scene = KitScene | PlateScene | GlbScene | CodeScene;

export type Shot = {
  scene: string;
  /** Absolute episode frames, [start, end). Shots must be contiguous. */
  frames: [number, number];
  camera: CameraMove;
  light?: LightName;
  /** Sun override for this shot (wins over the scene's). */
  sun?: SunOverride;
  /** Impact shake amplitude in metres, decaying over ~14 frames. */
  kick?: number;
  /** Absolute episode frame the impact lands on. Defaults to the shot start. */
  kickAt?: number;
  /** Blur-disc radius at infinity in px at 1080x1920. 0 disables DOF. */
  dof?: number;
  /** Distance in metres to the focal plane. If omitted, focuses on the primary cast actor or camera target. */
  focus?: number;
  cast?: CastCall[];
};

export type EpisodeAudio = {
  voice?: string;
  mix?: string;
};

export type Episode = {
  id: string;
  /** Optional display title for the composition picker. */
  title?: string;
  fps?: number;
  frames: number;
  /** Defaults to 1080x1920 (vertical short). */
  width?: number;
  height?: number;
  scenes: Record<string, Scene>;
  shots: Shot[];
  audio?: EpisodeAudio;
  endingCaption?: { from: number; text: string };
};
