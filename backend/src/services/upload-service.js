const { mediaPath } = require("../../environment-config");
const { upload } = require("../config/upload-config");
const fs = require('fs');

exports.uploadFile = (req) => {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, {}, (err) => {
      if (err) {
        return reject(err);
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
  const { mediaUrl } = req.query;
  const url = mediaPath + mediaUrl;
  const lowerUrl = mediaUrl.toLowerCase();

  fs.readFile(url, (err, data) => {
    if (err) {
      return res.status(404).json({ message: 'Media file not found' });
    }

    let contentType;
    if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lowerUrl.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lowerUrl.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (lowerUrl.endsWith('.mp4')) {
      contentType = 'video/mp4';
    } else if (lowerUrl.endsWith('.avi')) {
      contentType = 'video/x-msvideo';
    } else if (lowerUrl.endsWith('.mov')) {
      contentType = 'video/quicktime';
    } else {
      contentType = 'application/octet-stream';
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
};
