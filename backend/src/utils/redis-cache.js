'use strict';

const { client } = require('./redis');

// ── TTLs ──────────────────────────────────────────────────────────────────────
const TTL_WALL        = 30 * 60;   // 30 min
const TTL_ROLE        = 10 * 60;   // 10 min
const TTL_ACCESS      = 5  * 60;   // 5 min — anyoneCanView/Post flags can change
const TTL_USER_PROFILE = 60 * 60;  // 1 hour
const TTL_PRESENCE    = 5  * 60;   // 5 min heartbeat window
const TTL_IDEMPOTENCY = 5  * 60;   // 5 min dedup window

// ── Key helpers ───────────────────────────────────────────────────────────────
const wallKey        = (wallId)        => `cache:wall:${wallId}`;
const roleKey        = (wallId, email) => `cache:role:${wallId}:${email}`;
const accessKey      = (wallId, email) => `cache:access:${wallId}:${email}`;
const userProfileKey = (email)         => `cache:user:${email}`;
const presenceKey    = (wallId)        => `presence:wall:${wallId}`;
const idempotencyKey = (key)           => `idempotency:${key}`;

// ── Safe wrappers (Redis down = silent fail) ──────────────────────────────────
async function safeGet(key) {
  try { return await client.get(key); } catch { return null; }
}

async function safeSet(key, value, ttl) {
  try { await client.set(key, value, 'EX', ttl); } catch { /* silent */ }
}

async function safeDel(...keys) {
  try {
    if (keys.length) await client.del(...keys);
  } catch { /* silent */ }
}

// ── Wall cache ────────────────────────────────────────────────────────────────
async function getWallCache(wallId) {
  const raw = await safeGet(wallKey(wallId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function setWallCache(wallId, wall) {
  const plain = wall && typeof wall.toObject === 'function' ? wall.toObject() : wall;
  await safeSet(wallKey(wallId), JSON.stringify(plain), TTL_WALL);
}

async function invalidateWallCache(wallId) {
  await safeDel(wallKey(wallId));
}

// ── Role cache ────────────────────────────────────────────────────────────────
// Returns undefined on miss, null if member not found, string role on hit
async function getRoleCache(wallId, email) {
  const raw = await safeGet(roleKey(wallId, email));
  if (raw === null) return undefined;      // cache miss
  if (raw === 'null') return null;          // cached "no role"
  return raw;                               // cached role string
}

async function setRoleCache(wallId, email, role) {
  await safeSet(roleKey(wallId, email), role === null ? 'null' : role, TTL_ROLE);
}

async function invalidateRoleCache(wallId, emails) {
  if (!emails || !emails.length) return;
  await safeDel(...emails.map((e) => roleKey(wallId, e)));
}

// ── Access cache ──────────────────────────────────────────────────────────────
// Returns undefined on miss, true/false on hit
async function getAccessCache(wallId, email) {
  const raw = await safeGet(accessKey(wallId, email));
  if (raw === null) return undefined;   // cache miss
  return raw === '1';
}

async function setAccessCache(wallId, email, hasAccess) {
  await safeSet(accessKey(wallId, email), hasAccess ? '1' : '0', TTL_ACCESS);
}

async function invalidateAccessCache(wallId, emails) {
  if (!emails || !emails.length) return;
  await safeDel(...emails.map((e) => accessKey(wallId, e)));
}

// ── User profile cache ────────────────────────────────────────────────────────
// Returns { results: { email: profile }, misses: [email] }
async function getUserProfilesCache(emails) {
  const results = {};
  const misses = [];
  for (const email of emails) {
    const raw = await safeGet(userProfileKey(email));
    if (raw) {
      try { results[email] = JSON.parse(raw); } catch { misses.push(email); }
    } else {
      misses.push(email);
    }
  }
  return { results, misses };
}

// Call WITHOUT await at call site (fire-and-forget)
async function setUserProfileCache(email, profile) {
  await safeSet(userProfileKey(email), JSON.stringify(profile), TTL_USER_PROFILE);
}

async function invalidateUserProfileCache(email) {
  await safeDel(userProfileKey(email));
}

// ── Presence tracking (Sorted Set: score = epoch ms, value = email) ───────────
async function addPresence(wallId, email) {
  try {
    const key = presenceKey(wallId);
    await client.zadd(key, Date.now(), email);
    await client.expire(key, TTL_PRESENCE * 2);
  } catch { /* silent */ }
}

async function removePresence(wallId, email) {
  try { await client.zrem(presenceKey(wallId), email); } catch { /* silent */ }
}

async function getPresence(wallId) {
  try {
    const key = presenceKey(wallId);
    const staleThreshold = Date.now() - TTL_PRESENCE * 1000;
    await client.zremrangebyscore(key, '-inf', staleThreshold);
    return await client.zrange(key, 0, -1);
  } catch { return []; }
}

// ── Idempotency ───────────────────────────────────────────────────────────────
// Returns true if DUPLICATE (key existed), false if new request
async function checkIdempotency(key) {
  try {
    const result = await client.set(idempotencyKey(key), '1', 'EX', TTL_IDEMPOTENCY, 'NX');
    // SET NX returns 'OK' on insert (new), null if key existed (duplicate)
    return result === null;
  } catch { return false; } // on Redis error, allow request through
}

module.exports = {
  // Wall
  getWallCache,
  setWallCache,
  invalidateWallCache,
  // Role
  getRoleCache,
  setRoleCache,
  invalidateRoleCache,
  // Access
  getAccessCache,
  setAccessCache,
  invalidateAccessCache,
  // User profile
  getUserProfilesCache,
  setUserProfileCache,
  invalidateUserProfileCache,
  // Presence
  addPresence,
  removePresence,
  getPresence,
  // Idempotency
  checkIdempotency,
};
