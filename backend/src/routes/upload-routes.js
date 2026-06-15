const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload-controller');
const { verifyToken } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rate-limiter');

// Writing media requires an authenticated caller (Bearer or View token) + a rate
// limit, so the storage volume can't be filled by anonymous uploads.
router.post('/media', verifyToken, uploadLimiter, uploadController.uploadFile);
// Reads stay public: <img> tags fetch this directly and can't send the auth header.
router.get('/retrieve-file', uploadController.getFile);

module.exports = router;
