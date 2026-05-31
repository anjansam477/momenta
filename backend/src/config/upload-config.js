const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { mediaPath } = require('../../environment-config');
const { ObjectId } = require('mongodb');

function getFilePath(wallId, postId, fileName) {
  return path.join(mediaPath, 'media-files', wallId, postId, fileName);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const wallId = req.body.wallId;
    const postId = req.body.postId || new ObjectId().toString();
    const folderPath = path.join(mediaPath, 'media-files', wallId, postId);
    fs.mkdirSync(folderPath, { recursive: true });
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

// limits must be a plain object — 5MB covers videos; frontend enforces per-type limits
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

const profilePictureStorage = multer.memoryStorage();
const profilePictureUpload = multer({ storage: profilePictureStorage, limits: { fileSize: 5 * 1024 * 1024 } }).single('profilePicture');

module.exports = { upload, profilePictureUpload };
