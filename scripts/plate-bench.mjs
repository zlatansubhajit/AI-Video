// Phase 4 speed gate. Renders the `plate-kit` episode, whose first half is a
// live kit shot and whose second half is the same shot from a baked plate.
// Concurrency 1 makes frame order deterministic, so the per-frame timestamps
// separate the two halves cleanly (startup and encoding excluded).
//
//   docker compose run --rm remotion node scripts/plate-bench.mjs [frames per half]
//
// Write plates first: node scripts/plates.mjs

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";

const half = Number(process.argv[2] ?? 90);
const compositionId = process.argv[3] ?? "plate-kit";
const browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle-egl" };
const outDir = path.resolve("out/bench");
fs.mkdirSync(outDir, { recursive: true });

const entryPoint = path.resolve(process.env.REMOTION_ENTRY || "src/index.ts");
const serveUrl = await bundle({ entryPoint, publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: compositionId, browserExecutable, chromiumOptions });
if (composition.durationInFrames < half * 2) {
  throw new Error(`${compositionId} has ${composition.durationInFrames} frames, need ${half * 2}`);
}

const times = new Map();
const r3fKit = [];
const r3fPlate = [];
const t0 = Date.now();

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: path.join(outDir, "plate-kit.mp4"),
  frameRange: [0, half * 2 - 1],
  concurrency: 1,
  browserExecutable,
  chromiumOptions,
  imageFormat: "jpeg",
  overwrite: true,
  onProgress: ({ renderedFrames }) => times.set(renderedFrames, Date.now() - t0),
  onBrowserLog: (l) => {
    if (l.type === "error") {
      console.log(`[browser:error] ${l.text.slice(0, 300)}`);
    } else {
      const m = /\[R3F\] (kit|plate) frame=(\d+) ms=([0-9.]+)/.exec(l.text);
      if (m) {
        const frame = Number(m[2]);
        const ms = Number(m[3]);
        // exclude frame 0 and frame half (mount frames) from steady-state
        if (frame !== 0 && frame !== half) {
          if (m[1] === "kit") r3fKit.push(ms);
          else r3fPlate.push(ms);
        }
        console.log(`[browser] ${l.text}`);
      }
    }
  },
});

const at = (n) => (n === 0 ? 0 : times.get(n));
const kitSteady = (at(half - 1) - at(2)) / (half - 3) / 1000;
const plateSteady = (at(half * 2 - 1) - at(half + 2)) / (half - 3) / 1000;
const videoSpeedup = Number((kitSteady / plateSteady).toFixed(2));

const avgKitMs = r3fKit.length ? Number((r3fKit.reduce((a, b) => a + b, 0) / r3fKit.length).toFixed(2)) : null;
const avgPlateMs = r3fPlate.length ? Number((r3fPlate.reduce((a, b) => a + b, 0) / r3fPlate.length).toFixed(2)) : null;
const engineSpeedup = (avgKitMs && avgPlateMs) ? Number((avgKitMs / avgPlateMs).toFixed(2)) : null;

const passed = (engineSpeedup !== null && engineSpeedup >= 5) || videoSpeedup >= 5;

const result = {
  composition: compositionId,
  framesPerHalf: half,
  size: `${composition.width}x${composition.height}`,
  engineKitMsPerFrame: avgKitMs,
  enginePlateMsPerFrame: avgPlateMs,
  engineSpeedup,
  videoKitSecondsPerFrame: Number(kitSteady.toFixed(3)),
  videoPlateSecondsPerFrame: Number(plateSteady.toFixed(3)),
  videoSpeedup,
  wallSeconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
  passed,
  at: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "plate-results.json"), JSON.stringify(result, null, 2));

console.log(`\n[plate-bench] --- Results ---`);
console.log(`[plate-bench] Engine WebGL render: kit ${avgKitMs} ms/f, plate ${avgPlateMs} ms/f -> speedup ${engineSpeedup}x`);
console.log(`[plate-bench] Video delivery rate: kit ${kitSteady.toFixed(3)} s/f, plate ${plateSteady.toFixed(3)} s/f -> speedup ${videoSpeedup}x`);
console.log(`[plate-bench] Gate (>= 5x speedup): ${passed ? "PASS" : "FAIL"} (wall ${result.wallSeconds}s)`);
