import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Procedural painted steel texture with rivet rows, joint seams, and industrial weathering.
 */
export function getSteelTexture(
  colorHex = "#4f5866",
  rivets = true,
  weathering = true
): THREE.CanvasTexture {
  const key = `steel_${colorHex}_${rivets}_${weathering}`;
  if (cache.has(key)) return cache.get(key)!;

  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;

  // Base steel tone
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle rolled steel grain / brush lines
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.02 + Math.random() * 0.03;
    const y = Math.random() * 512;
    const h = 2 + Math.random() * 8;
    ctx.fillRect(0, y, 512, h);
  }

  // Steel plate seams (industrial plates)
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#1e2229";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  // Subtle joint highlight
  ctx.strokeStyle = "#828c9b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 258);
  ctx.lineTo(512, 258);
  ctx.moveTo(258, 0);
  ctx.lineTo(258, 512);
  ctx.stroke();

  if (rivets) {
    // Render neat rows of 3D-shaded rounded rivet heads along seams & edges
    const rivetPositions: [number, number][] = [];
    for (let x = 16; x < 512; x += 32) {
      rivetPositions.push([x, 16], [x, 512 - 16], [x, 240], [x, 272]);
    }
    for (let y = 32; y < 512 - 32; y += 32) {
      rivetPositions.push([16, y], [512 - 16, y], [240, y], [272, y]);
    }

    for (const [rx, ry] of rivetPositions) {
      const radius = 5.5;

      // Dark shadow crescent
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#111418";
      ctx.beginPath();
      ctx.arc(rx + 1, ry + 1.5, radius, 0, Math.PI * 2);
      ctx.fill();

      // Main rivet head
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit specular crescent on top-left
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = "#dce4ee";
      ctx.beginPath();
      ctx.arc(rx - 1.2, ry - 1.2, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (weathering) {
    // Grimy oxidation & river air staining near bottoms
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#261a12";
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = 300 + Math.random() * 212;
      ctx.fillRect(x, y, 4 + Math.random() * 8, 12 + Math.random() * 30);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/**
 * Macro steel girder texture with large hot/solid rivets and historical Tata Steel stamp.
 */
export function getMacroRivetTexture(): THREE.CanvasTexture {
  const key = "macro_rivet";
  if (cache.has(key)) return cache.get(key)!;

  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#3f4752";
  ctx.fillRect(0, 0, 512, 512);

  // Stamped historical lettering
  ctx.save();
  ctx.translate(60, 140);
  ctx.rotate(-0.04);
  ctx.font = "bold 26px monospace";
  ctx.fillStyle = "rgba(235, 240, 248, 0.45)";
  ctx.fillText("TATA TISCOR HIGH-TENSILE", 0, 0);
  ctx.font = "bold 20px monospace";
  ctx.fillText("SPEC: 26,500 TONS · 1943", 0, 32);
  ctx.fillText("NO BOLTS · ALL RIVETS", 0, 60);
  ctx.restore();

  // Heavy rivet grid
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) {
      const rx = 100 + col * 105;
      const ry = 270 + row * 85;
      const r = 24;

      // Deep cast shadow
      ctx.fillStyle = "rgba(10, 12, 16, 0.7)";
      ctx.beginPath();
      ctx.arc(rx + 4, ry + 6, r, 0, Math.PI * 2);
      ctx.fill();

      // Rounded steel dome
      const grad = ctx.createRadialGradient(rx - 6, ry - 6, 2, rx, ry, r);
      grad.addColorStop(0, "#cbd5e1");
      grad.addColorStop(0.35, "#64748b");
      grad.addColorStop(0.9, "#334155");
      grad.addColorStop(1, "#1e293b");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();

      // Highlight rim
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rx - 3, ry - 3, r * 0.7, Math.PI * 0.9, Math.PI * 1.8);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/**
 * Vintage 1940s Calcutta Tramways exterior body texture.
 */
export function getTramBodyTexture(): THREE.CanvasTexture {
  const key = "tram_body";
  if (cache.has(key)) return cache.get(key)!;

  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;

  // Upper cream / ivory half
  ctx.fillStyle = "#f3edd9";
  ctx.fillRect(0, 0, 512, 120);

  // Lower deep British racing green / maroon half
  ctx.fillStyle = "#801d24"; // classic Kolkata maroon
  ctx.fillRect(0, 120, 512, 136);

  // Gold belt dividing line
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(0, 116, 512, 8);

  // Arched wooden window frames
  const winCount = 6;
  const winW = 54;
  const winH = 70;
  const gap = (512 - winCount * winW) / (winCount + 1);

  for (let i = 0; i < winCount; i++) {
    const wx = gap + i * (winW + gap);
    const wy = 24;

    // Window frame border
    ctx.fillStyle = "#3c2a1a";
    ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);

    // Warm glowing night glass interior
    const glassGrad = ctx.createLinearGradient(wx, wy, wx, wy + winH);
    glassGrad.addColorStop(0, "#ffe899");
    glassGrad.addColorStop(0.5, "#f5c352");
    glassGrad.addColorStop(1, "#946312");

    ctx.fillStyle = glassGrad;
    ctx.fillRect(wx, wy, winW, winH);

    // Window mullions
    ctx.strokeStyle = "#3c2a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + winW / 2, wy);
    ctx.lineTo(wx + winW / 2, wy + winH);
    ctx.stroke();
  }

  // Calcutta Tramways crest & route
  ctx.fillStyle = "#d4af37";
  ctx.font = "bold 16px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("CALCUTTA TRAMWAYS COMPANY", 256, 160);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("HOWRAH STATION · ROUTE 36", 256, 185);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/**
 * Road deck surface with dual tram tracks, cobbles, and asphalt.
 */
export function getDeckTexture(): THREE.CanvasTexture {
  const key = "deck_tracks";
  if (cache.has(key)) return cache.get(key)!;

  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;

  // Road dark bitumen / steel deck plate
  ctx.fillStyle = "#2b3038";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle road aggregate
  ctx.fillStyle = "#383f4a";
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  // Dual steel tram tracks down the center
  const rails = [186, 214, 298, 326];
  for (const rx of rails) {
    // Rail grooved slot
    ctx.fillStyle = "#121417";
    ctx.fillRect(rx - 4, 0, 8, 512);

    // Steel shiny rail head
    ctx.fillStyle = "#9ba7b5";
    ctx.fillRect(rx - 2, 0, 4, 512);

    // Specular highlight
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(rx - 1, 0, 1.5, 512);
  }

  // Pedestrian walkway painted demarcation
  ctx.strokeStyle = "rgba(240, 240, 240, 0.4)";
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 16]);
  ctx.beginPath();
  ctx.moveTo(80, 0); ctx.lineTo(80, 512);
  ctx.moveTo(512 - 80, 0); ctx.lineTo(512 - 80, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
