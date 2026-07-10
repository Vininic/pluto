// Generates the PWA icon set from the Pluto mark (coin/medallion).
// Run: node scripts/generate-icons.mjs   (re-run after any identity change)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const INK = "#0E2218";        // vault deep — sidebar/vault background
const STROKE = "#E6C06C";     // soft gold

/** The mark at `scale` of the canvas (maskable icons need a ~80% safe zone). */
function markSvg(size, scale) {
  const s = (size * scale) / 64; // the mark's native viewBox is 64
  const offset = (size - 64 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${INK}"/>
    <g transform="translate(${offset} ${offset}) scale(${s})">
      <circle cx="32" cy="32" r="15" fill="none" stroke="${STROKE}" stroke-width="4"/>
      <circle cx="32" cy="32" r="8.5" fill="none" stroke="${STROKE}" stroke-width="3"/>
      <path d="M32 17.5 V13.5 M32 50.5 V46.5" stroke="${STROKE}" stroke-width="4" stroke-linecap="round"/>
    </g>
  </svg>`;
}

await mkdir("public", { recursive: true });
const jobs = [
  { file: "public/pwa-192x192.png", size: 192, scale: 0.86 },
  { file: "public/pwa-512x512.png", size: 512, scale: 0.86 },
  { file: "public/pwa-maskable-512x512.png", size: 512, scale: 0.6 },
];
for (const { file, size, scale } of jobs) {
  await sharp(Buffer.from(markSvg(size, scale))).png().toFile(file);
  console.log("wrote", file);
}
