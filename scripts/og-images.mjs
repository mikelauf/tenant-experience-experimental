// Link-preview crops for the event brief: Satori (next/og) can't read WebP, so each venue's hero gets a
// 1200×630 JPEG beside it. Run after changing a hero: node scripts/og-images.mjs <image id>...
// Uses the sharp that ships with Next for image optimization.
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "node_modules/next/package.json"));
const sharp = require("sharp");

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("usage: node scripts/og-images.mjs <image id>...");
  process.exit(1);
}
for (const id of ids) {
  const out = `public/images/og/${id}.jpg`;
  await sharp(`public/images/tap/${id}.webp`).resize(1200, 630, { fit: "cover", position: sharp.strategy.attention }).jpeg({ quality: 78, mozjpeg: true }).toFile(out);
  console.log(out);
}
