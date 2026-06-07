const { mediaPath } = require("../../environment-config");
const { upload } = require("../config/upload-config");
const { compressImageInPlace } = require("../utils/image-compressor");
const { generateWebpVariants, variantPath, VARIANT_WIDTHS } = require("../utils/image-variants");
const fs = require('fs');

const VARIANT_WIDTH_SET = new Set(VARIANT_WIDTHS.map(String));

// Map a stored file URL/path to a Content-Type by extension. Covers every type
// the upload whitelist accepts (image: jpeg/png/webp/gif, video: mp4/webm/mov)
// plus legacy .avi. Unknown → octet-stream.
const CONTENT_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};
function contentTypeForUrl(url) {
  const lower = String(url).toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot === -1 ? '' : lower.slice(dot);
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}
exports.contentTypeForUrl = contentTypeForUrl;

// Resolve a stored media.url to an on-disk path. Posts store an ABSOLUTE path
// (createPost saves file.path, e.g. "/root/media-files/..."), while the upload
// endpoint stores a RELATIVE one ("/media-files/..."). Prepend the media root
// only for the relative form so the absolute form isn't double-prefixed (which
// produced "/root/root/..." → 404).
function resolveMediaPath(mediaUrl) {
  const u = String(mediaUrl || '');
  return u.startsWith(mediaPath) ? u : mediaPath + u;
}
exports.resolveMediaPath = resolveMediaPath;

exports.uploadFile = (req) => {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, {}, async (err) => {
      if (err) {
        return reject(err);
      }
      // Downscale + recompress still images before they hit the volume.
      // Best-effort: never blocks the upload on a compression failure.
      if (req.file && req.file.path) {
        await compressImageInPlace(req.file.path, req.file.mimetype);
        // Emit responsive WebP variants (served on demand via ?w=). Best-effort.
        await generateWebpVariants(req.file.path, req.file.mimetype);
      }
      const modifiedPath = req.file.path.split(mediaPath)[1];
      const result = {
        body: req.body,
        file: req.file,
        uploadedPath: modifiedPath
      };
      resolve(result);
    });
  });
};

exports.getFile = async (req, res) => {
  const { mediaUrl, w } = req.query;
  const originalPath = resolveMediaPath(mediaUrl);

  // Responsive variant: if ?w=<allowed width> and the WebP variant exists on
  // disk, serve it; otherwise fall back to the original (so srcset candidates
  // never 404 — including for images uploaded before variants existed).
  let filePath = originalPath;
  if (w && VARIANT_WIDTH_SET.has(String(w))) {
    const variant = variantPath(originalPath, w);
    if (fs.existsSync(variant)) {
      filePath = variant;
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return res.status(404).json({ message: 'Media file not found' });
    }

    const contentType = contentTypeForUrl(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      // Public media; allow cross-origin <img crossorigin> so html2canvas (PDF
      // export) can read the pixels without tainting the canvas.
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
};
