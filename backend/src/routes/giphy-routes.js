const express = require("express");
const router = express.Router();
const c = require("../controllers/giphy-controller");

router.get("/gifs/trending",        c.getTrendingGifs);
router.get("/gifs/search",          c.getGifsBySearch);       // ?q=&offset=
router.get("/stickers/trending",    c.getTrendingStickers);
router.get("/stickers/search",      c.getStickersBySearch);   // ?q=&offset=
router.get("/trending/searches",    c.getTrendingSearchTerms);
router.get("/gifs/autocomplete",    c.getAutocompleteTags);   // ?q=
router.get("/tags/related/:term",   c.getRelatedTags);
router.post("/analytics/action",    c.trackAction);           // { analytics_response_payload, action }

module.exports = router;
