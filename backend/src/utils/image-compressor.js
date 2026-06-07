const sharp = require('sharp');
const fs = require('fs');
const logger = require('./logger');

// Cap the largest stored dimension. Walls render thumbnails far smaller than
// this, so 1920px is plenty while cutting phone-camera uploads (often 4000px+)
// down by an order of magnitude.
const MAX_DIMENSION = 1920;

// Only still raster formats are recompressed. GIFs are skipped so animation
// survives; videos are skipped entirely.
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Resize (downscale only) and recompress an uploaded image in place.
 * Writes to a temp file first, then atomically renames over the original so a
 * mid-write failure never corrupts the stored file.
 *
 * Returns true if the file was recompressed, false if skipped. Never throws —
 * on any failure the original file is left untouched and the caller proceeds.
 *
 * @param {string} filePath absolute path to the file multer just wrote
 * @param {string} mimetype detected upload content type
 * @returns {Promise<boolean>}
 */
async function compressImageInPlace(filePath, mimetype) {
  if (!COMPRESSIBLE.has(mimetype)) {
    return false;
  }

  const tmpPath = `${filePath}.tmp`;
  try {
    let pipeline = sharp(filePath, { failOn: 'none' })
      .rotate() // bake in EXIF orientation before stripping metadata
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });

    if (mimetype === 'image/jpeg') {
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
    } else if (mimetype === 'image/png') {
      pipeline = pipeline.png({ compressionLevel: 9, palette: true });
    } else if (mimetype === 'image/webp') {
      pipeline = pipeline.webp({ quality: 80 });
    }

    await pipeline.toFile(tmpPath);
    await fs.promises.rename(tmpPath, filePath);
    return true;
  } catch (err) {
    // Best-effort: clean up the temp file and keep the original upload.
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      /* temp may not exist */
    }
    logger.warn({ err, filePath }, 'image compression failed; keeping original upload');
    return false;
  }
}

module.exports = { compressImageInPlace, MAX_DIMENSION };
