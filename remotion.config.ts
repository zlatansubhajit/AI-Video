import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Software WebGL needs a long timeout; hardware WebGL finishes well inside it.
Config.setTimeoutInMilliseconds(120000);

// GL backend is chosen by env so one image can be benchmarked across paths.
// REMOTION_GL: angle-egl | angle | egl | vulkan | swangle
// angle-egl maps to `--use-gl=angle --use-angle=gl-egl`, the only path that
// reaches Mesa's D3D12 driver on WSL2. swangle is the software fallback.
// Verify with `docker compose run --rm remotion npm run gpu:check`.
const gl = (process.env.REMOTION_GL ?? "angle-egl") as Parameters<
  typeof Config.setChromiumOpenGlRenderer
>[0];
Config.setChromiumOpenGlRenderer(gl);

// One Chromium at a time: the GTX 1650 has 4 GB and WebGL contexts are heavy.
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 1));
