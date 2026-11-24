// Render benchmark: bundle once, render a short frame range under several GL
// backends, print seconds/frame. Run inside the docker compose service:
//
//   docker compose run --rm remotion npm run bench
//   docker compose run --rm remotion node scripts/bench-render.mjs 90 DancingBridgeDraft angle,swangle
//
// Results also land in out/bench/results.json so runs can be compared later.

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const frames = Number(process.argv[2] ?? 90);
const compositionId = process.argv[3] ?? "DancingBridgeDraft";
const glList = (process.argv[4] ?? process.env.BENCH_GL ?? "angle-egl,swangle")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const outDir = path.resolve("out/bench");
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

console.log(`[bench] composition=${compositionId} frames=0-${frames - 1} gl=${glList.join(",")}`);

const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  publicDir: path.resolve("public"),
});

const results = [];
for (const gl of glList) {
  const out = path.join(outDir, `${compositionId}_${gl}.mp4`);
  const started = Date.now();
  try {
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      browserExecutable,
      chromiumOptions: { gl },
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: out,
      browserExecutable,
      chromiumOptions: { gl },
      concurrency: Number(process.env.REMOTION_CONCURRENCY ?? 1),
      frameRange: [0, Math.max(0, frames - 1)],
      imageFormat: "jpeg",
      overwrite: true,
    });

    const seconds = (Date.now() - started) / 1000;
    const perFrame = seconds / frames;
    results.push({ gl, ok: true, seconds, perFrame, out });
    console.log(`[bench] ${gl.padEnd(10)} ${seconds.toFixed(2)}s total  ${perFrame.toFixed(3)} s/frame`);
  } catch (err) {
    const seconds = (Date.now() - started) / 1000;
    const message = err instanceof Error ? err.message : String(err);
    results.push({ gl, ok: false, seconds, error: message });
    console.log(`[bench] ${gl.padEnd(10)} FAILED after ${seconds.toFixed(2)}s: ${message.split("\n")[0]}`);
  }
}

fs.writeFileSync(
  path.join(outDir, "results.json"),
  JSON.stringify({ compositionId, frames, results }, null, 2),
);

console.log("\n[bench] gl         s/frame   total");
for (const r of results) {
  if (r.ok) console.log(`[bench] ${r.gl.padEnd(10)} ${r.perFrame.toFixed(3).padStart(8)} ${r.seconds.toFixed(1).padStart(8)}s`);
  else console.log(`[bench] ${r.gl.padEnd(10)}      FAILED`);
}
