import * as THREE from "three";
import { NOINK } from "../look/ink";

/** Layer 0 = inked 3D world geometry; Layer 3 (NOINK) = character cards, sky, FX (no world ink) */
export const LAYER_WORLD = 0;
export const LAYER_NOINK = NOINK;

export type LightMood = "day" | "golden" | "night";

interface LightPreset {
  azimuthDeg: number;
  elevationDeg: number;
  keyColor: string;
  keyIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogDensity: number;
  showMoon: boolean;
}

export const LIGHT_PRESETS: Record<LightMood, LightPreset> = {
  day: {
    azimuthDeg: 75,
    elevationDeg: 48,
    keyColor: "#fff4dd",
    keyIntensity: 1.45,
    hemiSky: "#b8d0ec",
    hemiGround: "#424d32",
    hemiIntensity: 0.65,
    skyTop: "#3e7fd2",
    skyHorizon: "#b8d0ec",
    fogColor: "#b8d0ec",
    fogDensity: 0.012,
    showMoon: false,
  },
  golden: {
    azimuthDeg: 25,
    elevationDeg: 22, // >= 18 deg to avoid 80m shadow blankets
    keyColor: "#ffab5e",
    keyIntensity: 1.35,
    hemiSky: "#ffc47c",
    hemiGround: "#4b3b36",
    hemiIntensity: 0.58,
    skyTop: "#8a6f8a",
    skyHorizon: "#ffc47c",
    fogColor: "#c9967a",
    fogDensity: 0.015,
    showMoon: false,
  },
  night: {
    azimuthDeg: 35,
    elevationDeg: 38,
    keyColor: "#b5d0ff",
    keyIntensity: 0.88,
    hemiSky: "#2a4170",
    hemiGround: "#10172a",
    hemiIntensity: 0.48,
    skyTop: "#080d1a",
    skyHorizon: "#16223d",
    fogColor: "#111b33",
    fogDensity: 0.022,
    showMoon: true,
  },
};

/** Deterministic PRNG so painted brush strokes never flicker across Remotion workers */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Painted brushstroke CanvasTexture generator.
 * Produces stylized gouache dabs without photographic noise.
 */
export function createPaintedTexture(
  baseHex: string,
  dabHexes: string[],
  seed: number,
  repeat: [number, number] = [1, 1],
  size = 512
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(seed);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = dabHexes[Math.floor(rand() * dabHexes.length)];
    ctx.globalAlpha = 0.16 + rand() * 0.24;
    const x = rand() * size;
    const y = rand() * size;
    const rx = 10 + rand() * 34;
    const ry = 4 + rand() * 14;
    const rot = (rand() - 0.5) * 0.7;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Two-tone cel-shaded MeshLambertMaterial (NEVER MeshStandardMaterial).
 * Preserves terrain albedo in shade via balanced shadow multiplier & low emissive lift.
 */
export function createTwoToneMaterial(options: {
  color?: string;
  map?: THREE.Texture;
  side?: THREE.Side;
  shade?: [number, number, number];
  lift?: [number, number, number];
}): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    color: options.color ?? "#ffffff",
    map: options.map ?? null,
    side: options.side ?? THREE.FrontSide,
  });

  const shade = options.shade ?? [0.24, 0.22, 0.20];
  const lift = options.lift ?? [0.02, 0.02, 0.03];

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShade = { value: new THREE.Vector3(...shade) };
    shader.uniforms.uLift = { value: new THREE.Vector3(...lift) };

    shader.fragmentShader =
      `uniform vec3 uShade;\nuniform vec3 uLift;\n` + shader.fragmentShader;

    // Quantize direct diffuse into crisp two-tone cel steps
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      `
      #include <lights_fragment_end>
      float lum = dot(reflectedLight.directDiffuse, vec3(0.299, 0.587, 0.114));
      float celBand = smoothstep(0.26, 0.34, lum);
      vec3 litTint = mix(uShade, vec3(1.0), celBand);
      reflectedLight.directDiffuse = diffuseColor.rgb * litTint * 0.92;
      reflectedLight.indirectDiffuse += diffuseColor.rgb * uLift;
      `
    );
  };

  mat.customProgramCacheKey = () =>
    `twoTone_${shade.join("_")}_${lift.join("_")}`;

  return mat;
}

/** Creates a saturated vertical-gradient sky dome + optional night lunar disc & halo */
export function createSkyRig(mood: LightMood): THREE.Group {
  const preset = LIGHT_PRESETS[mood];
  const rig = new THREE.Group();
  rig.name = "sky_rig";

  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 64;
  skyCanvas.height = 512;
  const ctx = skyCanvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, preset.skyTop);
  grad.addColorStop(0.55, preset.skyHorizon);
  grad.addColorStop(1.0, preset.skyHorizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);

  // Subtle painted stars on night sky
  if (mood === "night") {
    const rand = mulberry32(9041);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = "#e6f0ff";
      ctx.globalAlpha = 0.35 + rand() * 0.65;
      ctx.fillRect(rand() * 64, rand() * 210, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(68, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  dome.layers.set(LAYER_NOINK);
  rig.add(dome);

  if (preset.showMoon) {
    const az = THREE.MathUtils.degToRad(preset.azimuthDeg);
    const el = THREE.MathUtils.degToRad(preset.elevationDeg);
    const r = 48;
    const moonPos = new THREE.Vector3(
      Math.sin(az) * Math.cos(el) * r,
      Math.sin(el) * r,
      -Math.cos(az) * Math.cos(el) * r
    );

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 24),
      new THREE.MeshBasicMaterial({ color: "#eef5ff", fog: false })
    );
    disc.position.copy(moonPos);
    disc.lookAt(0, 0, 0);
    disc.layers.set(LAYER_NOINK);

    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(6.8, 24),
      new THREE.MeshBasicMaterial({
        color: "#8eb8ff",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        fog: false,
      })
    );
    halo.position.copy(moonPos).multiplyScalar(1.01);
    halo.lookAt(0, 0, 0);
    halo.layers.set(LAYER_NOINK);

    rig.add(halo, disc);
  }

  return rig;
}

/** Applies exact azimuth/elevation directional key light + hemisphere fill + fog */
export function applySceneLighting(scene: THREE.Scene, mood: LightMood): {
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
} {
  const p = LIGHT_PRESETS[mood];
  const az = THREE.MathUtils.degToRad(p.azimuthDeg);
  const el = THREE.MathUtils.degToRad(p.elevationDeg);
  const dist = 26;

  const keyLight = new THREE.DirectionalLight(p.keyColor, p.keyIntensity);
  keyLight.position.set(
    Math.sin(az) * Math.cos(el) * dist,
    Math.sin(el) * dist,
    Math.cos(az) * Math.cos(el) * dist
  );
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 60;
  const d = 16;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;

  const hemiLight = new THREE.HemisphereLight(
    p.hemiSky,
    p.hemiGround,
    p.hemiIntensity
  );

  scene.fog = new THREE.FogExp2(p.fogColor, p.fogDensity);
  scene.add(keyLight, hemiLight, createSkyRig(mood));

  return { keyLight, hemiLight };
}
