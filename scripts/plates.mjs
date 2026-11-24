// Bake plates into public/plates. Both passes render at 2160x3840 from the
// same kit preset and camera declared in the episode's PlateDef:
//
//   docker compose run --rm remotion node scripts/plates.mjs
//
// Output: public/plates/<id>.base.png (full look, no cast/DOF) and
// public/plates/<id>.depth.png (reciprocal depth in red, white = far).
// Re-render the target episode afterwards so Remotion bundles the new files.

import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";

const entryPoint = path.resolve(process.env.REMOTION_ENTRY || "src/index.ts");
const browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle-egl" };
const outDir = path.resolve("public/plates");

fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint, publicDir: path.resolve("public") });
const compositions = await getCompositions({ serveUrl, browserExecutable, chromiumOptions });

const plates = new Map();
for (const c of compositions) {
  const m = /^plate-(.+)-(color|depth)$/.exec(c.id);
  if (!m) continue;
  if (!plates.has(m[1])) plates.set(m[1], {});
  plates.get(m[1])[m[2]] = c;
}

if (!plates.size) {
  throw new Error("No plate-<id>-color / plate-<id>-depth compositions registered");
}

const render = async (composition, output, label) => {
  const t0 = Date.now();
  await renderStill({
    composition,
    serveUrl,
    frame: 0,
    output,
    imageFormat: "png",
    scale: 1,
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 600000,
    onBrowserLog: (l) => {
      if (l.type === "error") console.log(`[browser:error] ${l.text.slice(0, 300)}`);
    },
  });
  console.log(`[plates] ${label} ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${path.relative(process.cwd(), output)}`);
};

for (const [id, passes] of plates) {
  if (!passes.color || !passes.depth) throw new Error(`Plate "${id}" is missing a color or depth pass`);
  await render(passes.color, path.join(outDir, `${id}.base.png`), `${id} color`);
  await render(passes.depth, path.join(outDir, `${id}.depth.png`), `${id} depth`);
}

console.log("[plates] done");
