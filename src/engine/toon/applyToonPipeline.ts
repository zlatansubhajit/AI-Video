import * as THREE from "three";

export interface ToonPipelineOptions {
  /** Number of discrete cel-shading bands (3 is ideal for crisp cartoon look). */
  bands?: 3 | 4;
  /** Attach inverted-hull outlines to eligible meshes. */
  outline?: boolean;
  /** Outline ink hex color. */
  outlineColor?: string;
  /**
   * Outline scale. Values above 0.5 are used directly as a multiplier
   * (1.03 typical). Values of 0.5 or below are additive offsets, so `0.03`
   * means "grow the hull by 3%" (1.03). This keeps both call styles working.
   */
  outlineThickness?: number;
  /** Mesh name substrings excluded from receiving outlines (e.g. ground, foliage, sky). */
  outlineExcludePatterns?: string[];
  /** Enable castShadow / receiveShadow on meshes. */
  shadows?: boolean;
  /** Override castShadow independently of `shadows`. */
  castShadow?: boolean;
  /** Override receiveShadow independently of `shadows`. */
  receiveShadow?: boolean;
  /** Slight emissive lift so dark crevices never crush to pure black. */
  ambientLift?: number;
}

const DEFAULT_EXCLUDE = [
  "ground",
  "terrain",
  "floor",
  "field",
  "grass",
  "leaf",
  "leaves",
  "foliage",
  "sky",
  "cloud",
  "water",
  "outline_hull",
];

const gradientCache = new Map<number, THREE.DataTexture>();

/**
 * Generates and caches a crisp 1D NearestFilter DataTexture for MeshToonMaterial.
 */
export function getToonGradientMap(bands: 3 | 4 = 3): THREE.DataTexture {
  const cached = gradientCache.get(bands);
  if (cached) return cached;

  const stops =
    bands === 4
      ? [72, 140, 205, 255]
      : [88, 178, 255];

  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    const v = stops[i];
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  gradientCache.set(bands, texture);
  return texture;
}

/**
 * Converts a standard Three.js material into a matching MeshToonMaterial
 * while preserving albedo textures, tint colors, alpha, and sidedness.
 */
function convertMaterialToToon(
  source: THREE.Material,
  gradientMap: THREE.DataTexture,
  ambientLift: number
): THREE.MeshToonMaterial {
  const std = source as THREE.MeshStandardMaterial;
  const color = std.color ? std.color.clone() : new THREE.Color("#ffffff");

  const toon = new THREE.MeshToonMaterial({
    color,
    map: std.map ?? null,
    alphaMap: std.alphaMap ?? null,
    transparent: std.transparent ?? false,
    opacity: std.opacity ?? 1,
    alphaTest: std.alphaTest ?? 0,
    side: std.side ?? THREE.FrontSide,
    vertexColors: std.vertexColors ?? false,
    gradientMap,
  });

  if (std.emissive && std.emissiveIntensity && std.emissiveIntensity > 0) {
    toon.emissive = std.emissive.clone();
    toon.emissiveIntensity = std.emissiveIntensity;
  } else if (ambientLift > 0) {
    toon.emissive = color.clone().multiplyScalar(ambientLift);
  }

  return toon;
}

/**
 * Creates a lightweight inverted-hull outline child mesh.
 */
export function createOutlineMesh(
  geometry: THREE.BufferGeometry,
  color = "#1a1220",
  thickness = 1.035
): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(geometry, mat);
  outline.name = "outline_hull";
  outline.scale.setScalar(thickness);
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.raycast = () => {};
  return outline;
}

/**
 * Traverses a loaded .glb scene or procedural Three.js Object3D and enforces
 * the faceless-video-v2 visual grammar: unified 3-band toon shading,
 * crisp soft shadows, and selective inverted-hull outlines.
 */
export function applyToonPipeline(
  root: THREE.Object3D,
  options: ToonPipelineOptions = {}
): THREE.Object3D {
  const {
    bands = 3,
    outline = true,
    outlineColor = "#1a1220",
    outlineThickness = 1.03,
    outlineExcludePatterns = DEFAULT_EXCLUDE,
    shadows = true,
    castShadow,
    receiveShadow,
    ambientLift = 0.06,
  } = options;

  const gradientMap = getToonGradientMap(bands);
  const meshesToOutline: THREE.Mesh[] = [];
  const hullScale = outlineThickness <= 0.5 ? 1 + outlineThickness : outlineThickness;
  const casts = castShadow ?? shadows;
  const receives = receiveShadow ?? shadows;

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.name === "outline_hull") return;

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) =>
        convertMaterialToToon(m, gradientMap, ambientLift)
      );
    } else if (obj.material) {
      obj.material = convertMaterialToToon(obj.material, gradientMap, ambientLift);
    }

    if (shadows || castShadow !== undefined || receiveShadow !== undefined) {
      const lowerName = obj.name.toLowerCase();
      const isSky = lowerName.includes("sky") || lowerName.includes("cloud");
      obj.castShadow = !isSky && casts;
      obj.receiveShadow = !isSky && receives;
    }

    if (outline) {
      const lower = obj.name.toLowerCase();
      const excluded = outlineExcludePatterns.some((pat) => lower.includes(pat));
      const alreadyHasOutline = obj.children.some((c) => c.name === "outline_hull");
      if (!excluded && !alreadyHasOutline && obj.geometry) {
        meshesToOutline.push(obj);
      }
    }
  });

  for (const mesh of meshesToOutline) {
    const hull = createOutlineMesh(mesh.geometry, outlineColor, hullScale);
    mesh.add(hull);
  }

  return root;
}
