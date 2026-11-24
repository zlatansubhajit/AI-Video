FROM node:22-trixie-slim

# Mesa 25.x in Debian trixie can drive WSL2's D3D12 device (/dev/dxg).
# Bookworm's Mesa 22.3 silently falls back to swrast.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-numpy \
    python3-scipy \
    python3-pil \
    chromium \
    fonts-liberation \
    ca-certificates \
    libgl1 \
    libegl1 \
    libgles2 \
    libgl1-mesa-dri \
    libglx-mesa0 \
    libvulkan1 \
    mesa-utils \
    mesa-vulkan-drivers \
    vulkan-tools \
    && rm -rf /var/lib/apt/lists/* \
    && pip3 install --no-cache-dir --break-system-packages edge-tts

# Direct Remotion / Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Cache dependencies
COPY package.json .npmrc* ./
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

EXPOSE 3000

# Default: start Remotion Studio preview server bound to all interfaces
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
