/**
 * Redis-backed atomic counter cache for reactions and wall interactions.
 *
 * Why: Two users liking a post at the same instant → MongoDB read-modify-write
 * is a race. Redis HINCRBY/INCR are single-threaded atomic ops — no race,
 * no lost increments. MongoDB stays the authoritative store; Redis is the
 * fast read layer that also absorbs write bursts (eventual consistency).
 *
 * TTL strategy: counters live in Redis ~24h from last write, with random jitter
 * so a burst of keys created together don't all expire in the same second and
 * stampede MongoDB on the next read (thundering herd). Hot paths pipeline the
 * mutate+expire into a single round-trip via MULTI.
 */

const { client } = require("./redis");

const TTL_BASE = 60 * 60 * 24;   // 24 hours
const TTL_JITTER = 60 * 60 * 4;  // spread expiry across [24h, 28h)

// Per-write randomized TTL to de-synchronize expirations.
function ttl() {
  return TTL_BASE + Math.floor(Math.random() * TTL_JITTER);
}

// ── key helpers ──────────────────────────────────────────────────────────────

function reactionKey(postId) {
  return `cnt:reactions:${postId}`;
}

function interactionKey(wallId) {
  return `cnt:interactions:${wallId}`;
}

function postCountKey(wallId) {
  return `cnt:posts:${wallId}`;
}

function interactionMemberKey(wallId) {
  return `cnt:interaction:members:${wallId}`;
}

// ── reactions ─────────────────────────────────────────────────────────────────

/**
 * Atomically increment reaction count.
 * Returns new count for that reaction type.
 */
async function incrReaction(postId, reactionType) {
  const key = reactionKey(postId);
  const [[, count]] = await client
    .multi()
    .hincrby(key, reactionType, 1)
    .expire(key, ttl())
    .exec();
  return count;
}

/**
 * Atomically decrement reaction count (floor at 0).
 */
async function decrReaction(postId, reactionType) {
  const key = reactionKey(postId);
  const [[, count]] = await client
    .multi()
    .hincrby(key, reactionType, -1)
    .expire(key, ttl())
    .exec();
  if (count < 0) await client.hset(key, reactionType, 0);
  return Math.max(count, 0);
}

/**
 * Get all reaction counts for a post from cache.
 * Returns null on cache miss — caller should query MongoDB and call setReactions().
 */
async function getReactions(postId) {
  const raw = await client.hgetall(reactionKey(postId));
  if (!raw) return null;
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, parseInt(v, 10)])
  );
}

/**
 * Populate cache from a MongoDB reactions array.
 * Call this after a cache miss to warm the counter.
 */
async function setReactions(postId, reactionsMap) {
  const key = reactionKey(postId);
  if (Object.keys(reactionsMap).length === 0) return;
  const flat = Object.entries(reactionsMap).flatMap(([k, v]) => [k, String(v)]);
  await client.multi().hset(key, ...flat).expire(key, ttl()).exec();
}

/**
 * Invalidate cached reactions for a post (e.g. after bulk delete).
 */
async function invalidateReactions(postId) {
  await client.del(reactionKey(postId));
}

// ── wall interaction count ────────────────────────────────────────────────────

/**
 * Record that a user visited/interacted with a wall.
 * Uses a Redis SET so duplicate interactions from same user don't inflate count.
 * Returns true if this was a NEW interaction (user not seen before).
 */
async function addInteractionMember(wallId, email) {
  const memberKey = interactionMemberKey(wallId);
  const isNew = await client.sadd(memberKey, email);
  if (isNew) {
    await client.multi().incr(interactionKey(wallId)).expire(interactionKey(wallId), ttl()).exec();
  }
  await client.expire(memberKey, ttl());
  return isNew === 1;
}

/**
 * Get interaction count for a wall from cache.
 * Returns null on miss.
 */
async function getInteractionCount(wallId) {
  const raw = await client.get(interactionKey(wallId));
  return raw !== null ? parseInt(raw, 10) : null;
}

/**
 * Populate interaction count from MongoDB value for a wall.
 */
async function setInteractionCount(wallId, count) {
  await client.set(interactionKey(wallId), String(count), "EX", ttl());
}

/**
 * Check if a user has interacted with a wall (from cache member set).
 * Returns null on miss (caller should check MongoDB).
 */
async function hasInteracted(wallId, email) {
  const memberKey = interactionMemberKey(wallId);
  const exists = await client.exists(memberKey);
  if (!exists) return null; // cache miss
  const isMember = await client.sismember(memberKey, email);
  return isMember === 1;
}

/**
 * Invalidate all counter caches for a wall.
 */
async function invalidateWallCounters(wallId) {
  await client.del(interactionKey(wallId), interactionMemberKey(wallId), postCountKey(wallId));
}

// ── post count ────────────────────────────────────────────────────────────────

async function incrPostCount(wallId) {
  const key = postCountKey(wallId);
  await client.multi().incr(key).expire(key, ttl()).exec();
}

async function decrPostCount(wallId) {
  const key = postCountKey(wallId);
  const [[, val]] = await client.multi().decr(key).expire(key, ttl()).exec();
  if (val < 0) await client.set(key, "0", "EX", ttl());
}

async function getPostCount(wallId) {
  const raw = await client.get(postCountKey(wallId));
  return raw !== null ? parseInt(raw, 10) : null;
}

async function setPostCount(wallId, count) {
  await client.set(postCountKey(wallId), String(count), "EX", ttl());
}

module.exports = {
  incrReaction,
  decrReaction,
  getReactions,
  setReactions,
  invalidateReactions,
  addInteractionMember,
  getInteractionCount,
  setInteractionCount,
  hasInteracted,
  invalidateWallCounters,
  incrPostCount,
  decrPostCount,
  getPostCount,
  setPostCount,
  _ttl: ttl, // exported for tests
};
