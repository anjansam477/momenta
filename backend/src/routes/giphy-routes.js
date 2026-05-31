const express = require("express");
const router = express.Router();
const giphyController = require("../controllers/giphy-controller");

router.get("/gifs/trending", giphyController.getTrendingGifs);
router.get("/gifs/search", giphyController.getGifsBySearch);
router.get("/stickers/trending", giphyController.getTrendingStickers);
router.get("/stickers/search", giphyController.getStickersBySearch);
module.exports = router;
