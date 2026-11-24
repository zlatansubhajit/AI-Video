// Render stills for look checks. Runs in the container, so Chromium and the
// GL backend come from the environment:
//
//   docker compose run --rm remotion node scripts/stills.mjs \
//     DancingBridgeDraft out/stills/bridge_ 100,400,900 1
//
// Args: <compositionId> <outPrefix> <frame,frame,...> [scale]
// Env:  REMOTION_GL (angle|egl|vulkan|swangle), REMOTION_ENTRY (alt entrypoint)

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const [
  compositionId = "DancingBridgeDraft",
  prefix = "out/stills/x_",
  frames = "0",
  scale = "1",
] = process.argv.slice(2);

if (process.env.REMOTION_TMP) {
  fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true });
  process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP;
}

const browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle-egl" };
const entryPoint = path.resolve(process.env.REMOTION_ENTRY || "src/index.ts");

console.log(`[stills] ${compositionId} gl=${chromiumOptions.gl} scale=${scale}`);

const serveUrl = await bundle({ entryPoint, publicDir: path.resolve("public") });
const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  browserExecutable,
  chromiumOptions,
});

fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });

const onBrowserLog = (l) => {
  if (l.type === "error" || l.type === "warning" || l.text.includes("[R3F:")) {
    console.log(`[browser:${l.type}] ${l.text.slice(0, 300)}`);
  }
};

for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({
    composition,
    serveUrl,
    frame: f,
    output: `${prefix}${f}.jpg`,
    imageFormat: "jpeg",
    jpegQuality: 90,
    scale: Number(scale),
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 180000,
    onBrowserLog,
  });
  console.log(`[stills] frame ${f} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
