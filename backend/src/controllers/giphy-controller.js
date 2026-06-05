const giphyService = require("../services/giphy-service");
const { GIPHY_API_KEY } = require("../../environment-config");

const checkKey = (res) => {
  if (!GIPHY_API_KEY) {
    res.status(503).json({ error: 'GIPHY_API_KEY not configured' });
    return false;
  }
  return true;
};

exports.getTrendingGifs = async (req, res) => {
  if (!checkKey(res)) return;
  try { res.json(await giphyService.getTrendingGifs()); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getGifsBySearch = async (req, res) => {
  if (!checkKey(res)) return;
  const q = req.query.q?.trim();
  if (!q) return res.status(400).json({ error: 'query required' });
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  try { res.json(await giphyService.getGifsBySearch(q, offset)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTrendingStickers = async (req, res) => {
  if (!checkKey(res)) return;
  try { res.json(await giphyService.getTrendingStickers()); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStickersBySearch = async (req, res) => {
  if (!checkKey(res)) return;
  const q = req.query.q?.trim();
  if (!q) return res.status(400).json({ error: 'query required' });
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  try { res.json(await giphyService.getStickersBySearch(q, offset)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getTrendingSearchTerms = async (req, res) => {
  if (!checkKey(res)) return;
  try { res.json(await giphyService.getTrendingSearchTerms()); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getAutocompleteTags = async (req, res) => {
  if (!checkKey(res)) return;
  const q = req.query.q?.trim();
  if (!q) return res.status(400).json({ error: 'query required' });
  try { res.json(await giphyService.getAutocompleteTags(q)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getRelatedTags = async (req, res) => {
  if (!checkKey(res)) return;
  try { res.json(await giphyService.getRelatedTags(req.params.term)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

// Called when user selects/sends a GIF — required by Giphy ToS for analytics
exports.trackAction = async (req, res) => {
  if (!checkKey(res)) return;
  const { analytics_response_payload, action } = req.body;
  if (!analytics_response_payload) return res.status(400).json({ error: 'analytics_response_payload required' });
  giphyService.trackAction(analytics_response_payload, action || 'click'); // fire-and-forget
  res.json({ ok: true });
};
