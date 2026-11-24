// Painted canvas textures for the Shawshank-inspired prison world. Everything
// here is drawn procedurally in the same gouache/ink language as the kit sets:
// flat block colours, visible brush dabs, chipped edges and no photographic noise.
import * as THREE from "three";
import { ctex, rep } from "../../engine/textures/paint";

const ink = "rgba(34,28,32,0.78)";

/** cold, damp ashlar for the cell walls */
export const cellStone = () =>
  ctex("shawshank_cellstone", 512, 512, (g, r) => {
    g.fillStyle = "#4a4644";
    g.fillRect(0, 0, 512, 512);
    const cols = ["#9a938a", "#8c857c", "#a49d93", "#7f7971", "#948c82", "#89837b"];
    for (let row = 0; row < 5; row++) {
      let x = row % 2 ? -70 : 0;
      while (x < 512) {
        const w = 92 + r() * 68;
        const c = cols[Math.floor(r() * cols.length)];
        g.fillStyle = c;
        g.fillRect(x + 3, row * 104 + 3, w - 6, 98);
        // painted light from above + grime at the foot of each block
        g.fillStyle = "rgba(255,247,226,0.15)";
        g.fillRect(x + 5, row * 104 + 5, w - 10, 13);
        g.fillStyle = "rgba(20,22,26,0.15)";
        g.fillRect(x + 5, row * 104 + 86, w - 10, 14);
        // chisel dabs
        for (let k = 0; k < 7; k++) {
          g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(15,15,18,0.12)";
          g.beginPath();
          g.ellipse(x + 10 + r() * (w - 20), row * 104 + 15 + r() * 74, 3 + r() * 8, 1.5 + r() * 4, r(), 0, 7);
          g.fill();
        }
        // occasional crack / chipped corner
        if (r() > 0.72) {
          const cx = x + 12 + r() * (w - 24);
          g.strokeStyle = ink;
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(cx, row * 104 + 8);
          g.lineTo(cx + (r() - 0.5) * 20, row * 104 + 38);
          g.lineTo(cx + (r() - 0.5) * 30, row * 104 + 78);
          g.stroke();
        }
        x += w;
      }
    }
    // damp streaks running down from the ceiling
    for (let i = 0; i < 14; i++) {
      const x = r() * 512;
      g.fillStyle = "rgba(40,52,50,0.10)";
      g.fillRect(x, 0, 3 + r() * 9, 90 + r() * 350);
    }
    // rust / mildew blooms
    for (let i = 0; i < 9; i++) {
      const x = r() * 512, y = 300 + r() * 200, rad = 20 + r() * 55;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(67,78,61,0.16)");
      gr.addColorStop(1, "rgba(67,78,61,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

/** worn flagstones for the cell floor */
export const cellFloor = () =>
  ctex("shawshank_cellfloor", 512, 512, (g, r) => {
    g.fillStyle = "#3e3b39";
    g.fillRect(0, 0, 512, 512);
    const cols = ["#7f7a72", "#736e67", "#8c857b", "#6a655f"];
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const c = cols[(x + y * 2) % 4];
        const px = x * 256 + 6, py = y * 256 + 6;
        g.fillStyle = c;
        g.fillRect(px, py, 244, 244);
        g.fillStyle = "rgba(255,246,226,0.09)";
        g.fillRect(px + 5, py + 5, 234, 10);
        g.fillStyle = "rgba(0,0,0,0.14)";
        g.fillRect(px + 5, py + 228, 234, 11);
        // scuffs and small chips
        for (let k = 0; k < 18; k++) {
          g.strokeStyle = r() > 0.5 ? "rgba(38,35,33,0.35)" : "rgba(210,200,180,0.12)";
          g.lineWidth = 1 + r() * 2;
          const sx = px + 14 + r() * 216, sy = py + 14 + r() * 216;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(sx + (r() - 0.5) * 40, sy + (r() - 0.5) * 12);
          g.stroke();
        }
        if (r() > 0.55) {
          g.strokeStyle = ink;
          g.lineWidth = 1.3;
          g.beginPath();
          g.moveTo(px + 30 + r() * 120, py + 20);
          g.lineTo(px + 60 + r() * 120, py + 120);
          g.lineTo(px + 50 + r() * 160, py + 230);
          g.stroke();
        }
      }
    }
  });

/** dark soot-stained brick for the prison's outer walls */
export const prisonBrick = () =>
  ctex("shawshank_prisonbrick", 512, 512, (g, r) => {
    g.fillStyle = "#3b3a37";
    g.fillRect(0, 0, 512, 512);
    const cols = ["#766f64", "#6c665d", "#83796b", "#5f5b55", "#8b7f6d", "#736b60"];
    for (let row = 0; row < 16; row++) {
      for (let i = -1; i < 8; i++) {
        const c = cols[Math.floor(r() * cols.length)];
        const x = i * 68 + (row % 2) * 34 + 3;
        const y = row * 32 + 3;
        g.fillStyle = c;
        g.fillRect(x, y, 62, 26);
        g.fillStyle = "rgba(255,244,220,0.11)";
        g.fillRect(x + 2, y, 58, 3);
        g.fillStyle = "rgba(0,0,0,0.14)";
        g.fillRect(x + 2, y + 23, 58, 3);
        if (r() > 0.82) {
          g.fillStyle = "rgba(20,24,22,0.35)";
          g.fillRect(x + 2, y + 2, 58, 24);
        }
      }
    }
    // soot / weather wash
    for (let i = 0; i < 12; i++) {
      const x = r() * 512, y = r() * 512, rad = 30 + r() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(24,25,24,0.20)");
      gr.addColorStop(1, "rgba(24,25,24,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

/** wet, blue-black exterior stone for the storm wall */
export const wetWall = () =>
  ctex("shawshank_wetwall", 512, 512, (g, r) => {
    g.fillStyle = "#272c31";
    g.fillRect(0, 0, 512, 512);
    const cols = ["#4c555c", "#434c53", "#545d63", "#3d454c", "#5b6368"];
    for (let row = 0; row < 12; row++) {
      let x = row % 2 ? -60 : 0;
      while (x < 512) {
        const w = 80 + r() * 70;
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x + 2, row * 43 + 2, w - 4, 38);
        g.fillStyle = "rgba(190,215,235,0.10)";
        g.fillRect(x + 4, row * 43 + 3, w - 8, 4);
        x += w;
      }
    }
    for (let i = 0; i < 38; i++) {
      g.fillStyle = "rgba(170,200,225,0.10)";
      g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 20 + r() * 90);
    }
  });

/** packed, wet yard dirt */
export const yardDirt = () =>
  ctex("shawshank_yarddirt", 512, 512, (g, r) => {
    g.fillStyle = "#6b6258";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = ["#796f63", "#5f574e", "#857a6c", "#575049", "#73685b"][Math.floor(r() * 5)];
      g.globalAlpha = 0.35 + r() * 0.3;
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 5 + r() * 24, 3 + r() * 12, r() * 3, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    // gravel
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() > 0.5 ? "#958a7b" : "#4f4a44";
      g.fillRect(r() * 512, r() * 512, 1.5 + r() * 3, 1.5 + r() * 2.5);
    }
    // damp patches
    for (let i = 0; i < 10; i++) {
      const x = r() * 512, y = r() * 512, rad = 18 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(30,38,44,0.28)");
      gr.addColorStop(1, "rgba(30,38,44,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

/** dry golden meadow for the final shot */
export const meadowGold = () =>
  ctex("shawshank_meadow", 1024, 1024, (g, r) => {
    g.fillStyle = "#7d883c";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 320; i++) {
      g.fillStyle = ["#93a04a", "#6b7731", "#a8ad55", "#5f6d2e", "#b6a64f"][Math.floor(r() * 5)];
      g.globalAlpha = 0.25 + r() * 0.3;
      g.beginPath();
      g.ellipse(r() * 1024, r() * 1024, 30 + r() * 90, 12 + r() * 40, r() * 3, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    g.lineCap = "round";
    for (let i = 0; i < 5200; i++) {
      const x = r() * 1024, y = r() * 1024, l = 5 + r() * 15;
      g.strokeStyle = ["#7f8d3d", "#a4b05a", "#66742f", "#c2b45b"][Math.floor(r() * 4)];
      g.lineWidth = 1 + r() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 5, y - l);
      g.stroke();
    }
    for (let i = 0; i < 200; i++) {
      g.fillStyle = ["#f1df8d", "#ffffff", "#e7b85c"][Math.floor(r() * 3)];
      g.globalAlpha = 0.7;
      g.beginPath();
      g.arc(r() * 1024, r() * 1024, 1.4 + r() * 2, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
  });

/** storm water: dark indigo with silver crest strokes */
export const stormWater = () =>
  ctex("shawshank_stormwater", 1024, 1024, (g, r) => {
    g.fillStyle = "#101d30";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = ["rgba(94,132,170,0.5)", "rgba(60,95,135,0.45)", "rgba(160,195,224,0.35)"][Math.floor(r() * 3)];
      g.lineWidth = 1 + r() * 3;
      const x = r() * 1024, y = r() * 1024, l = 25 + r() * 80;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + l / 2, y - 5 - r() * 8, x + l, y);
      g.stroke();
    }
    for (let i = 0; i < 380; i++) {
      g.fillStyle = "rgba(210,230,245,0.5)";
      g.fillRect(r() * 1024, r() * 1024, 2 + r() * 5, 1 + r() * 2);
    }
  });

/** coarse prison blanket */
export const blanket = () =>
  ctex("shawshank_blanket", 512, 512, (g, r) => {
    g.fillStyle = "#5f6f62";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? "#d6c7a4" : "#3f4f49";
      g.globalAlpha = 0.75;
      g.fillRect(0, i * 86 + 22, 512, 22);
    }
    g.globalAlpha = 1;
    for (let y = 0; y < 512; y += 5) {
      g.strokeStyle = "rgba(20,20,20,0.06)";
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(512, y);
      g.stroke();
    }
    for (let x = 0; x < 512; x += 7) {
      g.strokeStyle = "rgba(238,230,210,0.05)";
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle = "rgba(28,30,26,0.14)";
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 10 + r() * 46, 6 + r() * 22, r() * 3, 0, 7);
      g.fill();
    }
  });

/** mattress ticking */
export const ticking = () =>
  ctex("shawshank_ticking", 512, 512, (g, r) => {
    g.fillStyle = "#b9ad91";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 3 === 0 ? "#8d846f" : "#a99f88";
      g.fillRect(0, i * 44, 512, 10);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = "rgba(65,55,42,0.12)";
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 10 + r() * 40, 3 + r() * 12, r() * 3, 0, 7);
      g.fill();
    }
  });

/** aged dark wood */
export const oldWood = () =>
  ctex("shawshank_oldwood", 512, 512, (g, r) => {
    g.fillStyle = "#5a3f2a";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ["#6b4b31", "#4e3624", "#765238"][i % 3];
      g.fillRect(0, i * 64, 512, 60);
      g.fillStyle = "rgba(30,18,10,0.5)";
      g.fillRect(0, i * 64 + 60, 512, 4);
    }
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = "rgba(42,26,14,0.22)";
      g.lineWidth = 1 + r() * 2;
      const y = r() * 512;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(160, y + 3, 350, y - 4, 512, y + 1);
      g.stroke();
    }
  });

/** painted iron with rust blooms */
export const rustMetal = () =>
  ctex("shawshank_rustmetal", 256, 256, (g, r) => {
    g.fillStyle = "#4e545c";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = "rgba(140,150,160,0.12)";
      g.fillRect(r() * 256, r() * 256, 6 + r() * 26, 2 + r() * 5);
    }
    for (let i = 0; i < 18; i++) {
      const x = r() * 256, y = r() * 256, rad = 3 + r() * 14;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(132,72,40,0.55)");
      gr.addColorStop(1, "rgba(132,72,40,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

/** soft radial glow card (lamps, moon, lightning) */
export const glow = () =>
  ctex("shawshank_glow", 256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,0.72)");
    gr.addColorStop(0.6, "rgba(255,255,255,0.22)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });

/** rain on the cell window */
export const windowRain = () =>
  ctex("shawshank_windowrain", 256, 512, (g, r) => {
    g.clearRect(0, 0, 256, 512);
    g.lineCap = "round";
    for (let i = 0; i < 42; i++) {
      const x = r() * 256, y = r() * 512, l = 30 + r() * 110;
      g.strokeStyle = `rgba(198,222,248,${0.18 + r() * 0.45})`;
      g.lineWidth = 1 + r() * 2.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 6, y + l);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(220,238,255,${0.3 + r() * 0.4})`;
      g.beginPath();
      g.arc(r() * 256, r() * 512, 1 + r() * 2.6, 0, 7);
      g.fill();
    }
  });

/** yard wall sign */
export const prisonSign = () =>
  ctex("shawshank_sign", 512, 256, (g, r) => {
    g.fillStyle = "#26302c";
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#1b2320";
    g.fillRect(10, 10, 492, 236);
    g.strokeStyle = "#b9a879";
    g.lineWidth = 5;
    g.strokeRect(18, 18, 476, 220);
    g.fillStyle = "#d9cba5";
    g.textAlign = "center";
    g.font = "bold 58px 'Arial Narrow', Arial, sans-serif";
    g.fillText("STATE PRISON", 256, 105);
    g.font = "bold 20px Arial, sans-serif";
    g.fillStyle = "#b6a476";
    g.fillText("NO ADMITTANCE BEYOND THIS POINT", 256, 155);
    g.font = "20px Arial, sans-serif";
    g.fillText("EST. 1898", 256, 205);
    for (let i = 0; i < 20; i++) {
      g.fillStyle = "rgba(12,14,12,0.18)";
      g.fillRect(r() * 512, r() * 256, 2 + r() * 9, 20 + r() * 70);
    }
  });

// ---------------- the poster ----------------
const drawPoster = (g: CanvasRenderingContext2D, r: () => number) => {
  // deep teal cinema backdrop
  const bg = g.createLinearGradient(0, 0, 0, 720);
  bg.addColorStop(0, "#193640");
  bg.addColorStop(0.55, "#10262f");
  bg.addColorStop(1, "#0a1a22");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 720);

  // sunburst behind the star
  g.save();
  g.translate(256, 350);
  for (let i = 0; i < 18; i++) {
    g.rotate((Math.PI * 2) / 18);
    g.fillStyle = i % 2 ? "rgba(226,196,132,0.10)" : "rgba(226,196,132,0.045)";
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-34, -330);
    g.lineTo(34, -330);
    g.closePath();
    g.fill();
  }
  g.restore();

  // painted border and keyline
  g.fillStyle = "#eadbb6";
  g.fillRect(0, 0, 512, 14);
  g.fillRect(0, 706, 512, 14);
  g.fillRect(0, 0, 14, 720);
  g.fillRect(498, 0, 14, 720);
  g.strokeStyle = "#c8a96b";
  g.lineWidth = 3;
  g.strokeRect(24, 24, 464, 672);

  // top studio line + title
  g.textAlign = "center";
  g.fillStyle = "#d7c08a";
  g.font = "bold 17px Georgia, serif";
  g.fillText("MORRISON PICTURES PRESENTS", 256, 58);
  g.fillStyle = "#f2e4c2";
  g.font = "bold 86px Georgia, serif";
  g.fillText("RITA", 256, 146);
  g.fillStyle = "#c8553f";
  g.font = "bold 22px Georgia, serif";
  g.fillText("A NIGHT TO REMEMBER", 256, 180);

  // star: dark waves, cream face, red dress, raised arm
  // hair back
  g.fillStyle = "#261a1a";
  g.beginPath();
  g.ellipse(258, 258, 94, 78, -0.05, 0, 7);
  g.fill();
  g.beginPath();
  g.ellipse(196, 292, 48, 92, 0.22, 0, 7);
  g.fill();
  g.beginPath();
  g.ellipse(322, 290, 46, 88, -0.22, 0, 7);
  g.fill();
  // neck + face
  g.fillStyle = "#f1c9a4";
  g.fillRect(240, 300, 36, 40);
  g.beginPath();
  g.ellipse(258, 251, 48, 61, 0, 0, 7);
  g.fill();
  g.strokeStyle = "rgba(50,30,26,0.85)";
  g.lineWidth = 3;
  g.stroke();
  // hair fringe
  g.fillStyle = "#2a1c1a";
  g.beginPath();
  g.ellipse(258, 203, 50, 27, -0.04, 0, 7);
  g.fill();
  g.beginPath();
  g.ellipse(208, 221, 25, 44, 0.35, 0, 7);
  g.fill();
  g.beginPath();
  g.ellipse(310, 219, 23, 42, -0.35, 0, 7);
  g.fill();
  // face features
  g.strokeStyle = "#3a201d";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(235, 248);
  g.lineTo(246, 250);
  g.moveTo(270, 250);
  g.lineTo(281, 248);
  g.stroke();
  g.fillStyle = "#3a201d";
  g.beginPath();
  g.arc(241, 254, 3, 0, 7);
  g.arc(275, 254, 3, 0, 7);
  g.fill();
  g.fillStyle = "#c23a34";
  g.beginPath();
  g.ellipse(258, 282, 10, 5, 0, 0, 7);
  g.fill();

  // raised left arm (screen left) and gloved hand
  g.strokeStyle = "#f1c9a4";
  g.lineWidth = 20;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(214, 345);
  g.lineTo(162, 286);
  g.lineTo(152, 222);
  g.stroke();
  g.fillStyle = "#f1c9a4";
  g.beginPath();
  g.arc(152, 216, 14, 0, 7);
  g.fill();

  // red dress bodice
  g.fillStyle = "#c23a34";
  g.beginPath();
  g.moveTo(222, 328);
  g.quadraticCurveTo(258, 312, 296, 328);
  g.lineTo(318, 420);
  g.quadraticCurveTo(258, 456, 200, 420);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(60,24,26,0.75)";
  g.lineWidth = 3;
  g.stroke();
  // waist
  g.fillStyle = "#a82e2c";
  g.fillRect(214, 398, 90, 18);
  // flowing skirt
  g.fillStyle = "#c23a34";
  g.beginPath();
  g.moveTo(206, 414);
  g.quadraticCurveTo(180, 540, 156, 612);
  g.quadraticCurveTo(258, 646, 360, 610);
  g.quadraticCurveTo(334, 532, 310, 414);
  g.quadraticCurveTo(258, 440, 206, 414);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(60,24,26,0.8)";
  g.lineWidth = 3;
  g.stroke();
  // skirt folds
  g.strokeStyle = "rgba(91,31,33,0.55)";
  g.lineWidth = 2.4;
  for (const dx of [-24, 0, 24]) {
    g.beginPath();
    g.moveTo(258 + dx * 0.5, 440);
    g.quadraticCurveTo(258 + dx * 1.4, 530, 258 + dx * 1.9, 612);
    g.stroke();
  }
  // right arm down
  g.strokeStyle = "#f1c9a4";
  g.lineWidth = 17;
  g.beginPath();
  g.moveTo(300, 344);
  g.lineTo(338, 406);
  g.lineTo(330, 470);
  g.stroke();
  g.fillStyle = "#f1c9a4";
  g.beginPath();
  g.arc(330, 476, 12, 0, 7);
  g.fill();

  // bottom billing block
  g.fillStyle = "#e6d3a8";
  g.font = "bold 26px Georgia, serif";
  g.fillText("THE PICTURE OF THE YEAR", 256, 662);
  g.fillStyle = "#c8a96b";
  g.font = "19px Georgia, serif";
  g.fillText("NOW SHOWING  ·  ONE WEEK ONLY", 256, 690);

  // halftone print dots + folds + wear
  g.fillStyle = "rgba(240,225,190,0.07)";
  for (let y = 30; y < 700; y += 8) {
    for (let x = 30 + (y % 16) * 0.5; x < 490; x += 8) {
      if (r() > 0.55) g.fillRect(x, y, 1.4, 1.4);
    }
  }
  g.strokeStyle = "rgba(18,16,16,0.16)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(256, 14);
  g.lineTo(254, 706);
  g.moveTo(14, 360);
  g.lineTo(498, 356);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    g.fillStyle = "rgba(250,240,215,0.10)";
    g.fillRect(20 + r() * 460, 20 + r() * 670, 8 + r() * 20, 2 + r() * 4);
  }
};

export const posterArt = () =>
  ctex("shawshank_poster", 512, 720, (g, r) => {
    drawPoster(g, r);
  });

/** same poster, torn off along its right/bottom edge for the breach */
export const posterTorn = () =>
  ctex("shawshank_postertorn", 512, 720, (g, r) => {
    drawPoster(g, r);
    g.save();
    g.globalCompositeOperation = "destination-out";
    // ragged right edge
    g.beginPath();
    g.moveTo(512, 0);
    g.lineTo(430 + r() * 26, 60);
    g.lineTo(462 + r() * 24, 130);
    g.lineTo(414 + r() * 30, 210);
    g.lineTo(456 + r() * 22, 292);
    g.lineTo(402 + r() * 36, 368);
    g.lineTo(438 + r() * 26, 452);
    g.lineTo(384 + r() * 40, 540);
    g.lineTo(424 + r() * 28, 620);
    g.lineTo(372 + r() * 34, 720);
    g.lineTo(512, 720);
    g.closePath();
    g.fill();
    // bite out of the bottom-left corner
    g.beginPath();
    g.moveTo(0, 720);
    g.lineTo(40, 648);
    g.lineTo(96, 690);
    g.lineTo(128, 620);
    g.lineTo(176, 720);
    g.closePath();
    g.fill();
    g.restore();
    // pale torn paper edge
    g.strokeStyle = "rgba(238,224,196,0.85)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(430, 60);
    g.lineTo(460, 130);
    g.lineTo(414, 210);
    g.lineTo(455, 292);
    g.lineTo(402, 368);
    g.lineTo(438, 452);
    g.lineTo(384, 540);
    g.lineTo(424, 620);
    g.lineTo(372, 720);
    g.stroke();
  });

/** small jagged hole in the plaster behind the poster */
export const chipHole = () =>
  ctex("shawshank_chiphole", 256, 320, (g, r) => {
    const P: [number, number][] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rad = 82 + (r() - 0.5) * 34;
      P.push([128 + Math.cos(a) * rad * 0.78, 160 + Math.sin(a) * rad]);
    }
    // chipped pale plaster ringing the break
    g.fillStyle = "#a39b90";
    g.beginPath();
    P.forEach(([x, y], i) => {
      const px = 128 + (x - 128) * 1.12;
      const py = 160 + (y - 160) * 1.12;
      return i ? g.lineTo(px, py) : g.moveTo(px, py);
    });
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(232,224,205,0.5)";
    g.lineWidth = 3;
    g.stroke();
    // the dark opening itself
    g.fillStyle = "#080a0e";
    g.beginPath();
    P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    // hairline cracks running out from the break
    g.strokeStyle = "rgba(12,13,17,0.6)";
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2;
      const x = 128 + Math.cos(a) * 84, y = 160 + Math.sin(a) * 104;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * (14 + r() * 22), y + Math.sin(a) * (14 + r() * 22));
      g.stroke();
    }
  });

/** irregular broken-cell opening mask; the transparent middle reveals the tunnel card */
export const cellMouth = () =>
  ctex("shawshank_cellmouth", 512, 720, (g, r) => {
    g.fillStyle = "#494542";
    g.fillRect(0, 0, 512, 720);
    const cols = ["#9a938a", "#8c857c", "#a49d93", "#7f7971", "#948c82", "#89837b"];
    for (let row = 0; row < 5; row++) {
      let x = row % 2 ? -58 : 0;
      while (x < 512) {
        const w = 108 + r() * 82;
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x + 3, row * 145 + 3, w - 6, 138);
        g.fillStyle = "rgba(255,247,226,0.13)";
        g.fillRect(x + 5, row * 145 + 5, w - 10, 14);
        g.fillStyle = "rgba(18,20,24,0.16)";
        g.fillRect(x + 5, row * 145 + 124, w - 10, 15);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(15,15,18,0.11)";
          g.beginPath();
          g.ellipse(x + 12 + r() * (w - 24), row * 145 + 20 + r() * 100, 3 + r() * 9, 1.5 + r() * 4, r(), 0, 7);
          g.fill();
        }
        x += w;
      }
    }
    // grime and damp streaks
    for (let i = 0; i < 16; i++) {
      const x = r() * 512;
      g.fillStyle = "rgba(35,44,43,0.10)";
      g.fillRect(x, 0, 3 + r() * 10, 120 + r() * 300);
    }
    // jagged opening
    const P: [number, number][] = [
      [86, 52], [152, 38], [212, 48], [268, 30], [330, 42], [396, 34], [438, 76],
      [428, 140], [446, 206], [424, 270], [440, 338], [418, 398], [438, 464],
      [414, 528], [430, 594], [394, 648], [336, 636], [280, 660], [222, 642],
      [168, 656], [112, 628], [88, 574], [96, 512], [76, 452], [94, 388],
      [74, 322], [96, 258], [78, 196], [98, 132], [82, 88],
    ];
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "rgba(0,0,0,1)";
    g.beginPath();
    g.moveTo(P[0][0], P[0][1]);
    for (const [x, y] of P.slice(1)) g.lineTo(x, y);
    g.closePath();
    g.fill();
    g.restore();
    // dark inner rim + pale chipped lip
    g.beginPath();
    g.moveTo(P[0][0], P[0][1]);
    for (const [x, y] of P.slice(1)) g.lineTo(x, y);
    g.closePath();
    g.strokeStyle = "rgba(6,7,10,0.75)";
    g.lineWidth = 16;
    g.stroke();
    g.strokeStyle = "rgba(232,224,205,0.22)";
    g.lineWidth = 4;
    g.stroke();
    // hairline cracks running out from the mouth
    g.strokeStyle = "rgba(10,11,14,0.55)";
    g.lineWidth = 2;
    for (const [x, y, dx, dy] of [[96, 132, -30, -54], [438, 154, 40, -30], [424, 528, 44, 34], [116, 574, -40, 40], [330, 42, 18, -30]] as const) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx * 0.6, y + dy * 0.6);
      g.lineTo(x + dx, y + dy);
      g.stroke();
    }
  });

/** painted tunnel interior seen through the broken wall (2.5D depth) */
export const tunnelInner = () =>
  ctex("shawshank_tunnel", 512, 720, (g, r) => {
    const bg = g.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, "#05070b");
    bg.addColorStop(0.55, "#080d15");
    bg.addColorStop(1, "#04060a");
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 720);
    // far mouth: a faint blue opening at the end of the tunnel
    const fx = 256, fy = 360;
    const gr = g.createRadialGradient(fx, fy, 4, fx, fy, 150);
    gr.addColorStop(0, "rgba(126,169,224,0.55)");
    gr.addColorStop(0.28, "rgba(76,112,168,0.26)");
    gr.addColorStop(1, "rgba(20,30,46,0)");
    g.fillStyle = gr;
    g.fillRect(fx - 160, fy - 170, 320, 340);
    // perspective walls / rough ceiling converging on the far mouth
    const quads: [number, number][][] = [
      [[0, 0], [0, 720], [150, 560], [150, 150]],
      [[512, 0], [512, 720], [362, 560], [362, 150]],
      [[0, 0], [512, 0], [362, 150], [150, 150]],
      [[0, 720], [512, 720], [362, 560], [150, 560]],
    ];
    const qc = ["#1d232b", "#232a33", "#151a21", "#10141a"];
    quads.forEach((q, i) => {
      g.fillStyle = qc[i];
      g.beginPath();
      q.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
    });
    // broken stone texture hints inside the tunnel
    for (let i = 0; i < 70; i++) {
      const side = i % 2;
      const u = r();
      const x = side ? 512 - u * 150 : u * 150;
      const y = 150 + r() * 420;
      g.strokeStyle = r() > 0.5 ? "rgba(160,175,190,0.10)" : "rgba(0,0,0,0.28)";
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (side ? -1 : 1) * (8 + r() * 28), y + (r() - 0.5) * 12);
      g.stroke();
    }
    // rubble silhouette on the tunnel floor
    for (let i = 0; i < 16; i++) {
      const x = 120 + r() * 272, y = 540 + r() * 120, rad = 6 + r() * 22;
      g.fillStyle = r() > 0.5 ? "#141920" : "#1c222a";
      g.beginPath();
      g.ellipse(x, y, rad, rad * 0.62, r() * 3, 0, 7);
      g.fill();
    }
    // arrow-straight scratch marks: years of counting
    g.strokeStyle = "rgba(192,200,210,0.22)";
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.moveTo(196 + i * 5, 210);
      g.lineTo(198 + i * 5, 240);
      g.stroke();
    }
  });

/** repeat helper for tiled planes */
export const tiled = (tex: THREE.Texture, x: number, y: number) => rep(tex, x, y);
