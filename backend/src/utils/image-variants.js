const sharp = require('sharp');
const fs = require('fs');
const logger = require('./logger');

// Responsive widths emitted as WebP siblings of an uploaded still image.
// A request for `<file>?w=960` is served the `<file>.960.webp` variant if it
// exists, else the original — so srcset candidates never 404 for old uploads.
const VARIANT_WIDTHS = [480, 960, 1440];

const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

function variantPath(filePath, width) {
  return `${filePath}.${width}.webp`;
}

/**
 * Generate WebP variants (one per VARIANT_WIDTHS) next to a still image.
 * `withoutEnlargement` means a small source just yields source-sized variants —
 * all files are always created, so the frontend can reference every width safely.
 * Best-effort: never throws; returns the widths actually written.
 *
 * @param {string} filePath absolute path of the (already compressed) original
 * @param {string} mimetype detected upload content type
 * @returns {Promise<number[]>}
 */
async function generateWebpVariants(filePath, mimetype) {
  if (!COMPRESSIBLE.has(mimetype)) {
    return [];
  }

  const written = [];
  for (const width of VARIANT_WIDTHS) {
    const out = variantPath(filePath, width);
    try {
      await sharp(filePath, { failOn: 'none' })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(out);
      written.push(width);
    } catch (err) {
      try { await fs.promises.unlink(out); } catch { /* may not exist */ }
      logger.warn({ err, filePath, width }, 'webp variant generation failed; skipping width');
    }
  }
  return written;
}

module.exports = { generateWebpVariants, variantPath, VARIANT_WIDTHS };
