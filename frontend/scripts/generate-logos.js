/**
 * Extract and generate all ReachRipple logo variants from the source JPG.
 *
 * The source (reachripple.jpg) has a BLACK background. This script:
 *  1. Removes the black bg → transparent PNG
 *  2. Crops the RR monogram (icon) for small uses (navbar, favicon)
 *  3. Crops the full logo (monogram + text + tagline) for large uses
 *  4. Generates all needed sizes, formats, and variants
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC = path.resolve(__dirname, "../public/reachripple.jpg");
const PUBLIC = path.resolve(__dirname, "../public");
const LOGOS = path.resolve(PUBLIC, "logos");

if (!fs.existsSync(LOGOS)) fs.mkdirSync(LOGOS, { recursive: true });

/**
 * Remove black background from a buffer, making it transparent.
 * Uses brightness threshold with smooth alpha blending at edges.
 */
async function removeBlackBg(inputBuffer, threshold = 30, fadeRange = 30) {
  const { data, info } = await sharp(inputBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const total = info.width * info.height;

  for (let i = 0; i < total; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const brightness = (r + g + b) / 3;

    if (brightness < threshold) {
      pixels[i * 4 + 3] = 0; // fully transparent
    } else if (brightness < threshold + fadeRange) {
      // smooth edge transition
      const alpha = Math.round(((brightness - threshold) / fadeRange) * 255);
      pixels[i * 4 + 3] = alpha;
    }
    // else: keep original alpha (fully opaque)
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function run() {
  console.log("🎨  Extracting & generating logo assets…\n");

  const meta = await sharp(SRC).metadata();
  console.log(`   Source: ${meta.width}×${meta.height}  ${meta.format}\n`);

  // ═══════════════════════════════════════════════════════════════
  // Pixel-analyzed boundaries (from content analysis of the JPG):
  //   Content area:  top=228, bottom=1081, left=137, right=1353
  //   RR monogram:   rows 228–760
  //   Gap:           rows 760–812
  //   Text+tagline:  rows 812–1081
  // ═══════════════════════════════════════════════════════════════

  // ─── A. LOGOMARK (RR monogram only — for icons) ───────────────
  const monoTop = 190;
  const monoBottom = 775;
  const monoH = monoBottom - monoTop;            // ~585px
  const monoW = monoH;                            // square
  const monoLeft = Math.round((meta.width - monoW) / 2);

  console.log(`   Monogram extract: ${monoW}×${monoH} from (${monoLeft}, ${monoTop})`);

  const monogramRaw = await sharp(SRC)
    .extract({ left: monoLeft, top: monoTop, width: monoW, height: monoH })
    .png()
    .toBuffer();

  const transparentMark = await removeBlackBg(monogramRaw);

  // Save logomark at standard sizes
  for (const size of [16, 32, 48, 64, 128, 192, 256, 512]) {
    await sharp(transparentMark)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(LOGOS, `logomark-${size}.png`));
  }
  // Main app logomark (used in navbar, footer, loading)
  await sharp(transparentMark)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC, "logomark.png"));
  console.log("   ✅  Logomark (RR monogram) — 8 sizes + public/logomark.png");

  // ─── B. FULL LOGO (monogram + text + tagline — transparent) ───
  const fullTop = 190;
  const fullBottom = 1100;
  const fullLeft = 100;
  const fullRight = 1420;
  const fullW = fullRight - fullLeft;
  const fullH = fullBottom - fullTop;

  console.log(`   Full logo extract: ${fullW}×${fullH} from (${fullLeft}, ${fullTop})`);

  const fullRaw = await sharp(SRC)
    .extract({ left: fullLeft, top: fullTop, width: fullW, height: fullH })
    .png()
    .toBuffer();

  const transparentFull = await removeBlackBg(fullRaw);

  // Save full logo at standard widths (maintaining aspect ratio)
  for (const w of [500, 1000, 2000, 4000]) {
    await sharp(transparentFull)
      .resize(w, null, { fit: "inside", withoutEnlargement: false })
      .png({ quality: 100 })
      .toFile(path.join(LOGOS, `reachripple-${w}.png`));
  }
  console.log("   ✅  Full logo (transparent) — 500, 1000, 2000, 4000px");

  // ─── C. JPG — White background ────────────────────────────────
  await sharp(transparentFull)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(2000, null, { fit: "inside" })
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(path.join(LOGOS, "reachripple-white-bg.jpg"));
  console.log("   ✅  JPG white background");

  // ─── D. B&W — Black background ────────────────────────────────
  await sharp(transparentFull)
    .greyscale()
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .resize(2000, null, { fit: "inside" })
    .png()
    .toFile(path.join(LOGOS, "reachripple-bw-black.png"));
  console.log("   ✅  B&W black background");

  // ─── E. Monochrome (greyscale, transparent) ───────────────────
  await sharp(transparentFull)
    .greyscale()
    .resize(2000, null, { fit: "inside" })
    .png()
    .toFile(path.join(LOGOS, "reachripple-monochrome.png"));
  console.log("   ✅  Monochrome (greyscale transparent)");

  // ─── F. SVG wrapper ───────────────────────────────────────────
  const svgBuf = await sharp(transparentFull)
    .resize(2000, null, { fit: "inside" })
    .png()
    .toBuffer();
  const svgMeta = await sharp(svgBuf).metadata();
  const b64 = svgBuf.toString("base64");
  fs.writeFileSync(
    path.join(LOGOS, "reachripple.svg"),
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgMeta.width} ${svgMeta.height}" width="${svgMeta.width}" height="${svgMeta.height}">
  <title>ReachRipple Logo</title>
  <image width="${svgMeta.width}" height="${svgMeta.height}" href="data:image/png;base64,${b64}"/>
</svg>`,
    "utf8"
  );
  console.log("   ✅  SVG vector wrapper");

  // ─── G. Favicons ──────────────────────────────────────────────
  for (const size of [16, 32, 64]) {
    await sharp(transparentMark)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(LOGOS, `favicon-${size}.png`));
  }
  fs.copyFileSync(path.join(LOGOS, "favicon-32.png"), path.join(LOGOS, "favicon.ico"));
  console.log("   ✅  Favicons (16, 32, 64 + ico)");

  // ─── H. Copy key assets to public/ ────────────────────────────
  fs.copyFileSync(path.join(LOGOS, "logomark-192.png"), path.join(PUBLIC, "logo192.png"));
  fs.copyFileSync(path.join(LOGOS, "logomark-512.png"), path.join(PUBLIC, "logo512.png"));
  fs.copyFileSync(path.join(LOGOS, "favicon-32.png"), path.join(PUBLIC, "favicon.ico"));
  console.log("   ✅  Copied to public/: logo192.png, logo512.png, favicon.ico\n");

  // ─── Summary ──────────────────────────────────────────────────
  console.log("🎉  All assets generated!\n");
  const files = fs.readdirSync(LOGOS).sort();
  files.forEach((f) => {
    const stat = fs.statSync(path.join(LOGOS, f));
    console.log(`   ${f.padEnd(35)} ${(stat.size / 1024).toFixed(1).padStart(8)} KB`);
  });
}

run().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
