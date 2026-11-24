// The locked cast. These faces and outfits stay the same from episode to
// episode: a story picks from this library, it never redraws a character.
// Actions are small pose functions on the episode clock.
import { KID, OFFICER, Outfit, Prop, Expr, soldier, townsfolk } from "./toon";

export type CastMember = {
  outfit: Outfit;
  /** head-shape / blink seed; fixed per member so their face never changes */
  seed: number;
  /** optional height multiplier applied to the billboard */
  height?: number;
};

export const CAST: Record<string, CastMember> = {
  worker: {
    outfit: { jacket: "#b5653f", pants: "#33405a", boots: "#3a2a20", belt: "#4a3020", hat: "cap", cap: "#7a4a2e", skin: "#f1c27d" },
    seed: 1,
  },
  mason: {
    outfit: { jacket: "#5d7a3a", pants: "#3f4348", boots: "#3a2a20", belt: "#2b2b2b", hat: "cap", cap: "#3e4a34", skin: "#e8b98a" },
    seed: 2,
  },
  clerk: {
    outfit: { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#2c2c30", belt: "#2c3040", hat: "tophat", skin: "#fad9b4" },
    seed: 3,
  },
  officer: { outfit: OFFICER, seed: 4 },
  soldier: { outfit: soldier(0), seed: 5 },
  kid: { outfit: KID, seed: 6, height: 0.86 },
  kid_b: {
    outfit: { ...KID, jacket: "#3f8f7a", cap: "#e2b33c" },
    seed: 7,
    height: 0.82,
  },
  woman: { outfit: townsfolk(1), seed: 8 },
  man: { outfit: townsfolk(2), seed: 9 },
  elder: {
    outfit: { ...townsfolk(4), hair: "#cfc9bd", moustache: "#cfc9bd", hat: "hair" },
    seed: 10,
  },
  musician: {
    outfit: { ...townsfolk(0), hat: "cap", cap: "#8a3b4a" },
    seed: 11,
  },
  babu: {
    outfit: {
      jacket: "#e5a93c",
      pants: "#f4efe6",
      boots: "#4a3020",
      hat: "hair",
      hair: "#2b262d",
      moustache: "#2b262d",
      skin: "#e8b886",
      build: "adult",
      glasses: "slipped",
    },
    seed: 42,
  },
  babu_pond: {
    outfit: {
      jacket: "#7a5c26",
      pants: "#b8b2a7",
      boots: "#241810",
      hat: "hair",
      hair: "#1b181c",
      moustache: "#1b181c",
      skin: "#d8a876",
      build: "adult",
      glasses: "crooked",
    },
    seed: 42,
  },
  chintu: {
    outfit: {
      jacket: "#2c6cb0",
      pants: "#3b4252",
      boots: "#f4f1ea",
      hat: "cap",
      cap: "#d94336",
      skin: "#ecc498",
      build: "kid",
    },
    seed: 88,
    height: 0.84,
  },
  sam: {
    outfit: {
      jacket: "#2f633d", // forest green vest
      pants: "#2f3844",  // dark trail pants
      boots: "#3b2618",  // hiking boots
      hat: "cap",
      cap: "#ea580c",    // tangerine beanie
      skin: "#e8be92",
      build: "adult",
    },
    seed: 19,
    height: 1.0,
  },
  leo: {
    outfit: {
      jacket: "#254b77", // cobalt hoodie
      pants: "#c4b59d",  // khaki cargo trousers
      boots: "#2e2016",  // trail boots
      hat: "hair",
      hair: "#2e2018",
      glasses: "round",  // round glasses
      cap: "#d49a1f",    // mustard pack accent
      skin: "#f2c99d",
      build: "adult",
    },
    seed: 27,
    height: 0.98,
  },
  pup: {
    outfit: {
      jacket: "#78828f", // fluffy grey fur
      pants: "#5a626e",
      boots: "#241726",
      hat: "pup",
      skin: "#ffffff",
      build: "kid",
    },
    seed: 55,
    height: 0.45,
  },
  // Shawshank-inspired cast: faded prison chambray, warm skin, quiet faces.
  andy: {
    outfit: {
      jacket: "#6b86a8",
      pants: "#33405a",
      boots: "#2e241d",
      hat: "hair",
      hair: "#3a2a20",
      skin: "#e8be98",
      build: "adult",
    },
    seed: 77,
    height: 1.0,
  },
  andy_wet: {
    outfit: {
      jacket: "#4f6886",
      pants: "#28354b",
      boots: "#221a15",
      hat: "hair",
      hair: "#241a14",
      skin: "#dcb089",
      build: "adult",
    },
    seed: 77,
    height: 1.0,
  },
  red: {
    outfit: {
      jacket: "#7f8e9c",
      pants: "#3e4654",
      boots: "#2a2018",
      hat: "hair",
      hair: "#6b655f",
      moustache: "#6b655f",
      skin: "#9a6642",
      build: "adult",
    },
    seed: 78,
    height: 0.98,
  },
  guard: {
    outfit: {
      jacket: "#2f3d55",
      pants: "#2a3242",
      boots: "#1d1a1a",
      hat: "cap",
      cap: "#202a3c",
      buttons: "#d9c27a",
      skin: "#e0b48a",
      build: "stout",
    },
    seed: 79,
  },
};

export type ActionState = {
  mode: "march" | "stroll" | "stand" | "sit" | "fall";
  expr: Expr;
  /** walk cycle phase in turns (1 = one full cycle) */
  phase: number;
  lift?: number;
  tilt?: number;
  headTilt?: number;
  look?: number;
  stride?: number;
  prop?: Prop;
  wave?: number;
  /** both arms raised (0 = relaxed, 1 = fully overhead) */
  armsUp?: number;
  /** both arms opened away from the body (0 = relaxed, 1 = wide) */
  armsOut?: number;
};

const still = (expr: Expr, extra: Partial<ActionState> = {}): ActionState => ({ mode: "stand", expr, phase: 0, ...extra });

export const ACTIONS: Record<string, (t: number) => ActionState> = {
  idle: () => still("neutral", { look: 0 }),
  idle_smile: () => still("smile", { look: 0 }),
  listen: (t) => still("neutral", { look: Math.sin(t * 0.35) > 0 ? 1 : -1, tilt: 1.5 * Math.sin(t * 0.6) }),
  talk: (t) => still(((t * 0.7) % 2.4) < 1.6 ? "smile" : "neutral", { lift: 72 + 10 * Math.sin(t * 3.1), tilt: 1.2 * Math.sin(t * 1.7) }),
  walk: (t) => ({ mode: "stroll", expr: "neutral", phase: t * 1.55, look: 0, stride: 1 }),
  stroll: (t) => ({ mode: "stroll", expr: "smile", phase: t * 1.15, look: 0, stride: 0.9 }),
  march: (t) => ({ mode: "march", expr: "stern", phase: t * 2.05, look: 0, stride: 1 }),
  work: (t) => still("stern", { prop: ["hammer", 0.1 + 0.85 * Math.max(0, Math.sin(t * 6.2))], tilt: 3.5 * Math.sin(t * 6.2), look: 0 }),
  carry: (t) => still("stern", { lift: 150, tilt: 1.2 * Math.sin(t * 4.4) }),
  wave: (t) => still("grin", { wave: 0.1 + 0.14 * Math.sin(t * 7.5), look: 0 }),
  cheer: (t) => still(((t * 1.3) % 3) < 2 ? "laugh" : "grin", { wave: 0.08 + 0.2 * Math.sin(t * 7), tilt: 2 * Math.sin(t * 3.4) }),
  point: (t) => still("stern", { wave: 0.95, look: 1 }),
  shock: (t) => still("shock", { lift: 108, tilt: -5 + 1.4 * Math.sin(t * 1.8) }),
  sit: (t) => ({ mode: "sit", expr: ((t * 0.5) % 4) < 2.6 ? "smile" : "neutral", phase: 0, look: 0 }),
  sit_idle: (t) => ({ mode: "sit", expr: "neutral", phase: 0, look: Math.sin(t * 0.4) > 0 ? 1 : -1 }),
  bow: (t) => still("smile", { tilt: 12 + 10 * Math.max(0, Math.sin(t * 0.9)), lift: 70 }),
  babu_smart: (t) => still("grin", { wave: 0.9, tilt: 3.5 * Math.sin(t * 2.2), look: 1 }),
  babu_lean: (t) => still("smile", { lift: 110, tilt: -12 + 2.5 * Math.sin(t * 3.5), look: 1 }),
  babu_slip: (t) => still("shock", { lift: 180, tilt: -24 + 6 * Math.sin(t * 8), wave: 0.85 }),
  babu_pond: (t) => still("neutral", { lift: 75, tilt: 5 * Math.sin(t * 1.8), look: 0 }),
  babu_sigh: (t) => still("dazed", { tilt: 7, look: 0, lift: 45 }),
  chintu_phone: (t) => still("neutral", { prop: "phone", tilt: 7, look: 0 }),
  chintu_snicker: (t) => still("grin", { prop: "phone", wave: 0.12 * Math.sin(t * 9), tilt: -4 * Math.sin(t * 4) }),
  chintu_stroll: (t) => ({ mode: "stroll", expr: "smile", phase: t * 1.3, look: 0, stride: 0.85, prop: "phone" }),
  hike: (t) => ({
    mode: "stroll",
    expr: ((t * 0.4) % 3) < 1.5 ? "smile" : "neutral",
    phase: t * 1.45,
    look: Math.sin(t * 0.8) > 0.4 ? 1 : Math.sin(t * 0.8) < -0.4 ? -1 : 0,
    stride: 1.05,
    tilt: 2.5 * Math.sin(t * 2.9),
  }),
  hike_tired: (t) => ({
    mode: "stroll",
    expr: "stern",
    phase: t * 0.95,
    look: 0,
    stride: 0.8,
    tilt: 7 + 2 * Math.sin(t * 1.9),
    lift: 52,
  }),
  camp_sit: (t) => ({
    mode: "sit",
    expr: ((t * 0.6) % 3) < 1.8 ? "smile" : "neutral",
    phase: 0,
    look: Math.sin(t * 0.5) > 0 ? 1 : 0,
    tilt: 1.5 * Math.sin(t * 1.4),
  }),
  camp_talk: (t) => ({
    mode: "sit",
    expr: ((t * 1.1) % 2.5) < 1.4 ? "laugh" : "smile",
    phase: 0,
    look: 1,
    lift: 75 + 12 * Math.sin(t * 3.5),
    tilt: 3 * Math.sin(t * 2.2),
  }),
  sleep_tent: (t) => ({
    mode: "sit",
    expr: "neutral",
    phase: 0,
    look: 0,
    tilt: -18,
    lift: 40 + 2 * Math.sin(t * 1.2), // slow breathing
  }),
  wake_shock: (t) => ({
    mode: "stand",
    expr: "shock",
    phase: 0,
    look: Math.sin(t * 4.5) > 0 ? 1 : -1, // darting eyes
    lift: 105 + 4 * Math.sin(t * 8),
    tilt: -6 + 3 * Math.sin(t * 6),
  }),
  tremble_fear: (t) => ({
    mode: "sit",
    expr: "shock",
    phase: 0,
    look: Math.sin(t * 5.2) > 0 ? 1 : -1,
    lift: 85 + 8 * Math.sin(t * 18), // rapid breathing/tremble
    tilt: -12 + 4 * Math.sin(t * 24), // chattering/shivering
  }),
  kneel_gentle: (t) => ({
    mode: "sit",
    expr: "smile",
    phase: 0,
    look: 1,
    lift: 25 + 2 * Math.sin(t * 1.5),
    tilt: -12, // gentle lean forward
  }),
  pup_whimper: (t) => ({
    mode: "stand",
    expr: "fear",
    phase: 0,
    look: 0,
    lift: 20 + 4 * Math.sin(t * 9),
    tilt: -8 + 3 * Math.sin(t * 14),
    prop: "rope" as Prop,
  }),
  pup_free_hop: (t) => ({
    mode: "stroll",
    expr: "grin",
    phase: t * 2.8,
    look: 1,
    stride: 1.25,
    lift: 45 + 30 * Math.abs(Math.sin(t * 6)),
    tilt: 8 * Math.sin(t * 6),
  }),
  look_empty: (t) => ({
    mode: "sit",
    expr: "shock",
    phase: 0,
    look: -1,
    lift: 90 + 3 * Math.sin(t * 6),
    tilt: -8,
  }),
  // ---- Shawshank beats ----
  study_hammer: (t) => still("stern", {
    prop: ["hammer", 0.9],
    lift: 96 + 2 * Math.sin(t * 2.2),
    tilt: 3 + 1.2 * Math.sin(t * 1.5),
    look: 0.45,
    headTilt: -2,
  }),
  warn: (t) => still("stern", {
    wave: 0.9 + 0.06 * Math.sin(t * 3.4),
    tilt: -8 + 1.5 * Math.sin(t * 1.7),
    look: 1,
    lift: 78,
  }),
  listen_grave: (t) => still("pained", {
    look: -0.7,
    tilt: 4 + 1.4 * Math.sin(t * 1.4),
    lift: 62 + 1.5 * Math.sin(t * 2.6),
    headTilt: 1,
  }),
  poster_glance: (t) => still("neutral", {
    look: 0.9,
    tilt: -2 + 0.8 * Math.sin(t * 1.3),
    lift: 68 + 1.5 * Math.sin(t * 2.1),
    headTilt: -4,
  }),
  chip_wall: (t) => still("stern", {
    prop: ["hammer", 0.12 + 0.82 * Math.max(0, Math.sin(t * 6.2))],
    tilt: 5.5 * Math.sin(t * 6.2) - 1,
    look: 0.55,
    lift: 72,
    headTilt: 2,
  }),
  triumph: (t) => still("relief", {
    armsUp: 0.92 + 0.08 * Math.sin(t * 2.1),
    headTilt: -3 + 1.5 * Math.sin(t * 1.3),
    tilt: -3 + 1.2 * Math.sin(t * 1.1),
    lift: 100,
  }),
  free_stand: (t) => still("relief", {
    armsOut: 0.72 + 0.1 * Math.sin(t * 1.7),
    headTilt: 2 + 1.2 * Math.sin(t * 1.2),
    tilt: -1.5 + 1.2 * Math.sin(t * 1.6),
    lift: 96 + 2 * Math.sin(t * 2.0),
    look: 0.15,
  }),
};
