// Precipitation layers for kit scenes: one draw call each, animated entirely in
// the vertex shader from the episode clock, so a frame is deterministic and
// cheap (no CPU particle loop, no per-frame buffer uploads).
import React, { useMemo } from "react";
import * as THREE from "three";
import { ctex } from "../textures/paint";
import { NOINK } from "../look/ink";
import type { LightName, Vec3, WeatherName } from "../shot/types";

const streakTex = () => ctex("kit/rainStreak", 32, 64, (g) => {
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, "rgba(255,255,255,0)");
  grd.addColorStop(0.3, "rgba(255,255,255,0.85)");
  grd.addColorStop(0.75, "rgba(255,255,255,0.95)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(13, 0, 6, 64);
});

const flakeTex = () => ctex("kit/snowFlake", 64, 64, (g) => {
  const grd = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.95)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
});

const VERT = /* glsl */ `
attribute float aSeed;
attribute float aSpeed;
uniform float uTime;
uniform float uHeight;
uniform float uPixel;
uniform float uSize;
uniform float uDrift;
uniform float uWind;
varying float vFade;
void main() {
  vec3 p = position;
  p.y = mod(p.y - uTime * aSpeed, uHeight);
  // wind wraps the volume so long shots never empty one side
  p.x = mod(p.x + uWind * uTime * aSpeed * 0.5 + 19.0, 38.0) - 19.0;
  p.x += sin(uTime * 0.9 + aSeed * 6.2831) * uDrift;
  p.z += cos(uTime * 0.7 + aSeed * 4.7) * uDrift * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixel * (420.0 / max(1.0, -mv.z));
  // fade in just above the ground and out far from the lens
  vFade = smoothstep(0.0, 0.7, p.y) * (1.0 - smoothstep(26.0, 40.0, -mv.z));
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTilt;
varying float vFade;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float c = cos(uTilt), s = sin(uTilt);
  pc = mat2(c, -s, s, c) * pc;
  float a = texture2D(uMap, pc + 0.5).a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a * uOpacity * vFade);
}`;

type Stage = { points: THREE.Points; mat: THREE.ShaderMaterial };

const build = (weather: WeatherName, light: LightName, wind: number): Stage => {
  const rain = weather === "rain";
  const count = rain ? 2600 : 1500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const speed = new Float32Array(count);
  // deterministic layout: the same rain for every render of this shot
  let s = rain ? 7919 : 104729;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * 38;
    pos[i * 3 + 1] = rand() * 18;
    pos[i * 3 + 2] = (rand() - 0.5) * 38;
    seed[i] = rand();
    speed[i] = rain ? 9 + rand() * 4 : 1.05 + rand() * 0.95;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));

  const warm = light === "golden";
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: 18 },
      uPixel: { value: 1 },
      uSize: { value: rain ? 0.45 : 0.19 },
      uDrift: { value: rain ? 0.12 : 0.7 },
      uWind: { value: wind * (rain ? 0.25 : 0.6) },
      // rain streaks lean with the wind; snow is drawn as round flakes
      uTilt: { value: rain ? wind * 0.45 : 0 },
      uOpacity: { value: rain ? 0.7 : 0.95 },
      // rain picks up the sky; snow stays white but picks up a little of the hour
      uColor: { value: new THREE.Color(rain ? (warm ? "#e0cfc6" : "#c9d8e4") : warm ? "#fff1dc" : "#f7fafd") },
      uMap: { value: rain ? streakTex() : flakeTex() },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  points.layers.set(NOINK); // precipitation never gets ink outlines
  return { points, mat };
};

export const WeatherLayer: React.FC<{
  weather: WeatherName;
  light: LightName;
  frame: number;
  fps: number;
  /** centre of the precipitation volume (the shot's look-at point on the ground) */
  at: Vec3;
  /** composition height; point sprites are sized in output pixels */
  height: number;
  /** 0 = still, 1 = gusty */
  wind?: number;
}> = ({ weather, light, frame, fps, at, height, wind = 0 }) => {
  const stage = useMemo(() => build(weather, light, wind), [weather, light, wind]);
  stage.mat.uniforms.uTime.value = frame / Math.max(1, fps);
  stage.mat.uniforms.uPixel.value = height / 1080;
  stage.points.position.set(at[0], 0, at[2]);
  return <primitive object={stage.points} dispose={null} />;
};
