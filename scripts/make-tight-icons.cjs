/**
 * Generate tight-cropped icon variants from the user-supplied PWA icon.
 *
 * The PWA icons (icon-192.png, icon-512.png) include built-in safe-zone
 * padding so they survive launcher crops. That same padding makes them
 * look tiny when displayed inline in the header/sidebar/login at 40 px.
 *
 * Output : public/mark-*.png + .webp (tight, no padding)
 *          These are for INLINE UI use — not for the PWA install icon.
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

async function emit(side, opts = {}) {
  const buf = await sharp(SOURCE)
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 0,
    })
    .png()
    .toBuffer();
  const meta = await sharp(buf).metadata();
  // Re-pad onto a square so the mark is centred.
  const squareSide = Math.max(meta.width, meta.height);
  const pad = Math.round((squareSide - meta.width) / 2);
  const pad2 = Math.round((squareSide - meta.height) / 2);
  const squaredBuf = await sharp(buf)
    .extend({
      top: pad2,
      bottom: squareSide - meta.height - pad2,
      left: pad,
      right: squareSide - meta.width - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Resize to target, no upsizing from a small source
  const pngBuf = await sharp(squaredBuf)
    .resize({ width: side, withoutEnlargement: false })
    .png({
      compressionLevel: 9,
      palette: opts.palette !== false,
      quality: 90,
      effort: 10,
      colours: opts.colours ?? 96,
    })
    .toBuffer();

  await sharp(pngBuf).toFile(path.join(OUT, `mark-${side}.png`));

  // WebP variant
  const webpBuf = await sharp(squaredBuf)
    .resize({ width: side, withoutEnlargement: false })
    .webp({ quality: 92, effort: 6 })
    .toBuffer();
  await sharp(webpBuf).toFile(path.join(OUT, `mark-${side}.webp`));

  const pngSize = fs.statSync(path.join(OUT, `mark-${side}.png`)).size;
  const webpSize = fs.statSync(path.join(OUT, `mark-${side}.webp`)).size;
  console.log(`  ✓ mark-${side}.png ${(pngSize / 1024).toFixed(1)} KB · mark-${side}.webp ${(webpSize / 1024).toFixed(1)} KB`);
}

(async () => {
  console.log("\n▸ Tight-cropped mark for inline UI use");
  await emit(512, { colours: 96 });
  await emit(192, { colours: 96 });
  await emit(96, { colours: 64 });
  await emit(64, { colours: 48 });
  await emit(40, { colours: 32 });
  console.log("Done.");
})();