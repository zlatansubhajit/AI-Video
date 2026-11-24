#!/bin/sh
# Prints the GL renderer the container will use. Run via:
#   docker compose run --rm remotion npm run gpu:check
set -e
echo "REMOTION_GL=${REMOTION_GL:-unset}"
echo "MESA_LOADER_DRIVER_OVERRIDE=${MESA_LOADER_DRIVER_OVERRIDE:-unset}"
echo
EGL_PLATFORM=surfaceless eglinfo -B 2>/dev/null \
  | grep -E "EGL driver name|OpenGL core profile (vendor|renderer|version)" \
  | head -8 || true
