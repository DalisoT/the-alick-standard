/**
 * Compress and slice the brand logo into every size the app needs.
 *
 * Source : public/logo-source.png  (full lockup with "THE ALICK STANDARD" + tagline)
 * Output : public/logo*   (full lockup, web-optimised)
 *          public/mark*   (crown + monogram + tools — for icons / favicon / PWA)
 *
 * Run via:  npm run icons:logo
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "public");
const SOURCE = path.join(OUT, "logo-source.png");

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ Source not found: ${SOURCE}`);
  console.error("  Place the brand logo at public/logo-source.png and re-run.");
  process.exit(1);
}

const SOURCE_META = fs.statSync(SOURCE);
console.log(`Source: ${(SOURCE_META.size / 1024).toFixed(1)} KB`);

/**
 * Build a Sharp pipeline that trims transparent borders, optionally extracts
 * the top portion (the "mark") and pads it back to a square so it can be
 * resized cleanly into PWA-sized squares.
 *
 * All variants returned are SQUARE — that's the contract every consumer
 * (manifest, apple-touch, maskable, favicon) needs.
 */
async function buildSquare(opts = {}) {
  let pipeline = sharp(SOURCE, { failOn: "none" }).trim({
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    threshold: 0,
  });

  if (opts.cropToMark) {
    // Take the top ~62% of the trimmed lockup (crown + monogram + tools only)
    const meta = await pipeline.metadata();
    const keepHeight = Math.round(meta.height * 0.62);
    pipeline = pipeline.extract({
      left: 0,
      top: 0,
      width: meta.width,
      height: keepHeight,
    });
  }

  // Materialise the current state so we know the post-extract dims.
  const current = await pipeline.png().toBuffer();
  const meta = await sharp(current).metadata();

  // Pad to a square, centred, with optional background colour.
  const side = Math.max(meta.width, meta.height);
  const padTop = Math.floor((side - meta.height) / 2);
  const padBottom = Math.ceil((side - meta.height) / 2);
  const padLeft = Math.floor((side - meta.width) / 2);
  const padRight = Math.ceil((side - meta.width) / 2);

  let square = sharp(current).extend({
    top: padTop,
    bottom: padBottom,
    left: padLeft,
    right: padRight,
    background: opts.flatten
      ? opts.flatten
      : { r: 0, g: 0, b: 0, alpha: 0 }, // transparent by default
  });

  return { pipeline: square, side };
}

/**
 * Output a PNG at the requested side length, optionally also WebP.
 * `palette` quantises to a small colour count to keep file size down.
 * Source pipeline is materialised into a buffer first so the downstream
 * pipeline always operates on a real, square image.
 */
async function emit(pipeline, baseName, side, opts = {}) {
  // Force the input pipeline to materialise — prevents `.clone()` from
  // re-evaluating the source with a different metadata snapshot.
  const src = await pipeline.png().toBuffer();
  const srcPipeline = sharp(src);

  const pngOut = path.join(OUT, `${baseName}-${side}.png`);
  await srcPipeline
    .clone()
    .resize({ width: side, withoutEnlargement: !opts.allowUpsize })
    .png({
      compressionLevel: 9,
      palette: opts.palette !== false,
      quality: 90,
      effort: 10,
      colours: opts.colours ?? 64,
    })
    .toFile(pngOut);
  const pngSize = fs.statSync(pngOut).size;

  let webpSize = null;
  if (opts.webp !== false) {
    const webpOut = path.join(OUT, `${baseName}-${side}.webp`);
    await srcPipeline
      .clone()
      .resize({ width: side, withoutEnlargement: !opts.allowUpsize })
      .webp({ quality: opts.webpQuality ?? 88, effort: 6 })
      .toFile(webpOut);
    webpSize = fs.statSync(webpOut).size;
  }

  console.log(
    `  ✓ ${baseName}-${side}.png ${(pngSize / 1024).toFixed(1)} KB` +
      (webpSize ? ` · ${baseName}-${side}.webp ${(webpSize / 1024).toFixed(1)} KB` : ""),
  );
  return { pngSize, webpSize };
}

(async () => {
  console.log("\n▸ Full lockup (with text + tagline) — website display");
  const { pipeline: full, side: fullSide } = await buildSquare();
  console.log(`  Canvas: ${fullSide}x${fullSide}`);

  await emit(full, "logo", 1024, { allowUpsize: true, colours: 96 });
  await emit(full, "logo", 640, { colours: 96 });
  await emit(full, "logo", 480, { colours: 96 });
  await emit(full, "logo", 320, { colours: 64 });

  console.log("\n▸ Mark only (crown + monogram + tools) — icons & favicons");
  const { pipeline: mark, side: markSide } = await buildSquare({ cropToMark: true });
  console.log(`  Canvas: ${markSide}x${markSide}`);

  await emit(mark, "mark", 1024, { allowUpsize: true, colours: 96 });
  await emit(mark, "icon", 512, { colours: 64 });
  await emit(mark, "icon", 192, { colours: 64 });
  await emit(mark, "icon", 96, { colours: 48 });
  await emit(mark, "icon", 32, { colours: 32 });

  // Maskable — 70 % of the target inside a dark safe-area pad (chrome may mask the icon).
  console.log("\n▸ Maskable (mark on solid black, 70% safe area)");
  const markBuf = await mark.png().toBuffer();
  for (const target of [512, 192]) {
    const inner = Math.floor(target * 0.7);
    const pad = Math.floor((target - inner) / 2);
    // Resize the mark to `inner` first, then pad to `target`.
    const innerBuf = await sharp(markBuf)
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
      .png({ compressionLevel: 9, palette: true, quality: 90, colours: 64 })
      .toFile(path.join(OUT, `icon-maskable-${target}.png`));
    const size = fs.statSync(path.join(OUT, `icon-maskable-${target}.png`)).size;
    console.log(`  ✓ icon-maskable-${target}.png ${(size / 1024).toFixed(1)} KB`);
  }

  // Apple touch icon — solid black background (iOS doesn't honour transparency)
  console.log("\n▸ Apple touch (mark on solid black, opaque)");
  const appleBuf = await sharp(markBuf)
    .resize({ width: 180 })
    .png()
    .toBuffer();
  await sharp(appleBuf)
    .flatten({ background: { r: 11, g: 11, b: 12 } })
    .png({ compressionLevel: 9, palette: true, quality: 92, colours: 64 })
    .toFile(path.join(OUT, "apple-touch-icon.png"));
  const appleSize = fs.statSync(path.join(OUT, "apple-touch-icon.png")).size;
  console.log(`  ✓ apple-touch-icon.png ${(appleSize / 1024).toFixed(1)} KB`);

  // Legacy favicons
  fs.copyFileSync(path.join(OUT, "icon-32.png"), path.join(OUT, "favicon-32.png"));
  fs.copyFileSync(path.join(OUT, "icon-32.png"), path.join(OUT, "favicon.ico"));

  // Tidy the SVG placeholders (no longer needed)
  for (const f of ["icon.svg", "icon-maskable.svg", "favicon.svg"]) {
    const p = path.join(OUT, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  const total = fs
    .readdirSync(OUT)
    .filter((f) => /\.(png|webp|ico)$/i.test(f))
    .reduce((acc, f) => acc + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(
    `\n✓ Done. ${(total / 1024).toFixed(1)} KB total in /public (was ${(SOURCE_META.size / 1024).toFixed(1)} KB source).`,
  );
})();