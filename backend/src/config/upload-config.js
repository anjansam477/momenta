const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { mediaPath } = require('../../environment-config');
const { ObjectId } = require('mongodb');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Whitelisted upload content types. SVG is intentionally excluded (XSS vector).
const ALLOWED_MEDIA_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Strip any path components / unsafe chars so a crafted originalname can't
// escape the target directory (path traversal) or inject control chars.
function safeName(original) {
  const base = path.basename(original || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  // guard against names that are all dots (e.g. "..")
  return base.replace(/^\.+$/, 'file');
}

// Path segments must be valid Mongo ObjectIds — blocks "../" traversal via body.
function isValidId(id) {
  return typeof id === 'string' && ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

function mediaFileFilter(req, file, cb) {
  if (!ALLOWED_MEDIA_MIME.has(file.mimetype)) {
    return cb(new Error('Unsupported file type'));
  }
  cb(null, true);
}

function imageFileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
    return cb(new Error('Unsupported image type'));
  }
  cb(null, true);
}

function getFilePath(wallId, postId, fileName) {
  return path.join(mediaPath, 'media-files', wallId, postId, fileName);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const wallId = req.body.wallId;
    const postId = req.body.postId || new ObjectId().toString();
    if (!isValidId(wallId) || !isValidId(postId)) {
      return cb(new Error('Invalid upload target'));
    }
    const folderPath = path.join(mediaPath, 'media-files', wallId, postId);
    fs.mkdirSync(folderPath, { recursive: true });
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    cb(null, safeName(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: mediaFileFilter,
});

const profilePictureStorage = multer.memoryStorage();
const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
}).single('profilePicture');

module.exports = { upload, profilePictureUpload, getFilePath, safeName, isValidId };
