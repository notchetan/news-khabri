/* eslint-disable no-console */
// Generates the light/dark/tinted base app icons by recolouring the
// existing "N" mark (assets/images/icon.png).
//
// Per pixel: take luminance, run it through a smoothstep so the mark stays
// crisp, then lerp between a "mark" colour and a "background" colour. The
// negative-space slash through the N is bright, so it maps to background -
// which is what we want (it reads as a cut-out).
//
// iOS 18+ picks light / dark / tinted automatically from app.json's
// ios.icon object - there's no runtime code involved. Re-run this whenever
// icon.png or the palette below changes.
//
//   node scripts/generate-app-icons.js

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const SRC = path.join(__dirname, "..", "assets", "images", "icon.png");
const OUT_DIR = path.join(__dirname, "..", "assets", "images", "app-icons");

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function smoothstep(a, b, x) {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

function recolour(src, mark, bg) {
  const out = new PNG({ width: src.width, height: src.height });
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i];
    const g = src.data[i + 1];
    const b = src.data[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // < 0.55 -> mark, > 0.80 -> bg, antialiased between.
    const t = smoothstep(0.55, 0.8, lum);
    for (let c = 0; c < 3; c += 1) {
      out.data[i + c] = Math.round(mark[c] + (bg[c] - mark[c]) * t);
    }
    out.data[i + 3] = 255;
  }
  return out;
}

function main() {
  const src = PNG.sync.read(fs.readFileSync(SRC));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // mark / background colours, from src/constants/theme.ts's palette.
  const jobs = [
    ["light", hexToRgb("#A8552E"), hexToRgb("#FAF7F2")],
    ["dark", hexToRgb("#D98B63"), hexToRgb("#17140F")],
    // iOS applies its own monochrome tint over this one.
    ["tinted", [255, 255, 255], [0, 0, 0]],
  ];

  for (const [name, mark, bg] of jobs) {
    const png = recolour(src, mark, bg);
    const file = path.join(OUT_DIR, `${name}.png`);
    fs.writeFileSync(file, PNG.sync.write(png));
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
}

main();
