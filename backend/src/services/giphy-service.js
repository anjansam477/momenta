const { GIPHY_API_KEY } = require("../../environment-config");
const axios = require('axios');
const { getAsync, setAsync } = require('../utils/redis');

const BASE   = 'https://api.giphy.com/v1';
const LIMIT  = 50;   // Beta key max per request
const RATING = 'g';  // Safe for all ages
const BUNDLE = 'messaging_non_clips'; // Optimized renditions for messaging context

// Only request fields we actually use — reduces payload ~60%
const FIELDS = 'id,title,alt_text,images,analytics_response_payload';

const TTL = {
  trending:        24 * 60 * 60,       // 1 day  — content rotates daily
  search:           3 * 24 * 60 * 60,  // 3 days — per user request
  trendingSearches: 6 * 60 * 60,       // 6 hours — trends shift through day
  autocomplete:     1 * 60 * 60,       // 1 hour
  related:          6 * 60 * 60,       // 6 hours
};

const SEED_TERMS = [
  'happy', 'sad', 'birthday', 'love', 'funny', 'congratulations',
  'thank you', 'celebration', 'excited', 'wow', 'laughing', 'crying',
  'hello', 'bye', 'good morning', 'good night', 'party', 'heart',
  'clapping', 'dancing', 'thumbs up', 'fire',
];

// Shared query params appended to every content request
const BASE_PARAMS = `api_key=${GIPHY_API_KEY}&rating=${RATING}&bundle=${BUNDLE}&remove_low_contrast=true&fields=${encodeURIComponent(FIELDS)}`;

class GiphyService {

  /* ── Trending ─────────────────────────────────────────── */

  async getTrendingGifs() {
    const key = 'trending_gifs';
    const cached = await getAsync(key);
    if (cached) return this._sample(JSON.parse(cached), 30);

    const data = await this._fetch(`${BASE}/gifs/trending?${BASE_PARAMS}&limit=${LIMIT}`);
    await setAsync(key, JSON.stringify(data.data), 'EX', TTL.trending);
    return this._sample(data.data, 30);
  }

  async getTrendingStickers() {
    const key = 'trending_stickers';
    const cached = await getAsync(key);
    if (cached) return this._sample(JSON.parse(cached), 30);

    const data = await this._fetch(`${BASE}/stickers/trending?${BASE_PARAMS}&limit=${LIMIT}`);
    await setAsync(key, JSON.stringify(data.data), 'EX', TTL.trending);
    return this._sample(data.data, 30);
  }

  /* ── Search (with optional pagination offset) ─────────── */

  async getGifsBySearch(query, offset = 0) {
    const q = query.toLowerCase().trim();
    // Only cache offset=0 — deeper pages not worth a cache slot
    const key = offset === 0 ? `search_gifs_${q}` : null;

    if (key) {
      const cached = await getAsync(key);
      if (cached) return this._sample(JSON.parse(cached), 30);
    }

    const data = await this._fetch(
      `${BASE}/gifs/search?${BASE_PARAMS}&q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${offset}&lang=en`
    );
    if (key) await setAsync(key, JSON.stringify(data.data), 'EX', TTL.search);
    return this._sample(data.data, 30);
  }

  async getStickersBySearch(query, offset = 0) {
    const q = query.toLowerCase().trim();
    const key = offset === 0 ? `search_stickers_${q}` : null;

    if (key) {
      const cached = await getAsync(key);
      if (cached) return this._sample(JSON.parse(cached), 30);
    }

    const data = await this._fetch(
      `${BASE}/stickers/search?${BASE_PARAMS}&q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${offset}&lang=en`
    );
    if (key) await setAsync(key, JSON.stringify(data.data), 'EX', TTL.search);
    return this._sample(data.data, 30);
  }

  /* ── Discovery helpers ────────────────────────────────── */

  async getTrendingSearchTerms() {
    const key = 'trending_searches';
    const cached = await getAsync(key);
    if (cached) return JSON.parse(cached);

    const data = await this._fetch(`${BASE}/trending/searches?api_key=${GIPHY_API_KEY}`);
    await setAsync(key, JSON.stringify(data.data), 'EX', TTL.trendingSearches);
    return data.data;
  }

  async getAutocompleteTags(query) {
    const q = query.toLowerCase().trim();
    const key = `autocomplete_${q}`;
    const cached = await getAsync(key);
    if (cached) return JSON.parse(cached);

    const data = await this._fetch(
      `${BASE}/gifs/search/tags?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=8`
    );
    await setAsync(key, JSON.stringify(data.data), 'EX', TTL.autocomplete);
    return data.data;
  }

  async getRelatedTags(term) {
    const t = term.toLowerCase().trim();
    const key = `related_${t}`;
    const cached = await getAsync(key);
    if (cached) return JSON.parse(cached);

    const data = await this._fetch(
      `${BASE}/tags/related/${encodeURIComponent(t)}?api_key=${GIPHY_API_KEY}`
    );
    await setAsync(key, JSON.stringify(data.data), 'EX', TTL.related);
    return data.data;
  }

  /* ── Analytics action register ────────────────────────── */
  // Call this when a user clicks/sends a GIF — Giphy compliance + improves recommendations.
  // analyticsPayload comes from gif.analytics_response_payload in the GIF object.
  async trackAction(analyticsPayload, action = 'click') {
    if (!analyticsPayload) return;
    try {
      // Giphy embeds the full tracking URL in analytics_response_payload
      await axios.get(`https://api.giphy.com/v1/gifs/action?api_key=${GIPHY_API_KEY}&ts=${Date.now()}&action=${action}&analytics_response_payload=${encodeURIComponent(analyticsPayload)}`);
    } catch {
      // Non-fatal — analytics failure should never affect the user
    }
  }

  /* ── Startup seed ─────────────────────────────────────── */

  async seedPopularTerms() {
    if (!GIPHY_API_KEY) return;

    // Seed trending search terms list
    try {
      if (!await getAsync('trending_searches')) {
        const data = await this._fetch(`${BASE}/trending/searches?api_key=${GIPHY_API_KEY}`);
        await setAsync('trending_searches', JSON.stringify(data.data), 'EX', TTL.trendingSearches);
        await this._delay(800);
      }
    } catch { /* non-fatal */ }

    for (const term of SEED_TERMS) {
      try {
        const gifKey     = `search_gifs_${term}`;
        const stickerKey = `search_stickers_${term}`;

        if (!await getAsync(gifKey)) {
          const data = await this._fetch(
            `${BASE}/gifs/search?${BASE_PARAMS}&q=${encodeURIComponent(term)}&limit=${LIMIT}&lang=en`
          );
          await setAsync(gifKey, JSON.stringify(data.data), 'EX', TTL.search);
          await this._delay(800);
        }

        if (!await getAsync(stickerKey)) {
          const data = await this._fetch(
            `${BASE}/stickers/search?${BASE_PARAMS}&q=${encodeURIComponent(term)}&limit=${LIMIT}&lang=en`
          );
          await setAsync(stickerKey, JSON.stringify(data.data), 'EX', TTL.search);
          await this._delay(800);
        }
      } catch { /* skip term — will be served on demand */ }
    }
  }

  /* ── Internals ────────────────────────────────────────── */

  async _fetch(url) {
    if (!GIPHY_API_KEY) throw new Error('GIPHY_API_KEY is not configured');
    const response = await axios.get(url);
    return response.data;
  }

  _sample(array, count) {
    if (!array?.length) return [];
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(count, arr.length));
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = new GiphyService();
