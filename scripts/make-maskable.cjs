/**
 * Generate maskable PWA icon variants from the user-supplied 512×512.
 * Maskable needs ~40% safe-zone padding so the design survives launcher crops.
 */
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");

const OUT = path.join(__dirname, "..", "public");
const SOURCE = path.join(OUT, "icon-512.png");

if (!fs.existsSync(SOURCE)) {
  console.error("icon-512.png not found");
  process.exit(1);
}

async function emit(target) {
  // 60% of the canvas — fits inside the 40% safe-zone padding maskables need.
  const inner = Math.round(target * 0.6);
  const pad = Math.round((target - inner) / 2);

  const innerBuf = await sharp(SOURCE)
    .resize({ width: inner, withoutEnlargement: false })
    .png()
    .toBuffer();

  await sharp(innerBuf)
    .extend({
      top: pad,
      bottom: target - inner - pad,
      left: pad,
      right: target - inner - pad,
      background: { r: 11, g: 11, b: 12, alpha: 1 },
    })
    .png({ compressionLevel: 9, palette: true, quality: 92, colours: 64 })
    .toFile(path.join(OUT, `icon-maskable-${target}.png`));

  const size = fs.statSync(path.join(OUT, `icon-maskable-${target}.png`)).size;
  console.log(`✓ icon-maskable-${target}.png ${(size / 1024).toFixed(1)} KB`);
}

(async () => {
  await emit(512);
  await emit(192);
})();