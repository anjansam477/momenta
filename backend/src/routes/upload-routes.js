const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload-controller');

router.post('/media', uploadController.uploadFile);
router.get('/retrieve-file', uploadController.getFile);

module.exports = router;
