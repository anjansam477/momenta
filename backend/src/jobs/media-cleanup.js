const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const logger = require("../utils/logger");
const postRepository = require("../repositories/post-repository");
const { resolveMediaPath } = require("../services/upload-service");
const { mediaPath } = require("../../environment-config");

// Uploaded post media lives under <mediaPath>/media-files/<wallId>/<postId>/.
// Over time, deleted posts / failed uploads can leave orphaned blobs behind.
// This job reports (and, only when explicitly enabled, deletes) files that no
// post references any more.
//
// SAFETY: deletion is OFF by default. The sweep logs the orphan count + a sample
// so operators can eyeball it first; set ENABLE_MEDIA_CLEANUP_DELETE=true to act.
const MEDIA_ROOT = path.join(mediaPath, "media-files");
const GRACE_MS = 24 * 60 * 60 * 1000; // never touch files younger than 24h (in-flight uploads)

let task = null;

/** Recursively list every file under a directory as absolute paths. */
function listFilesRecursive(dir) {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

/**
 * Pure orphan matcher (unit-tested). A file is an orphan when:
 *  - it isn't directly referenced, AND
 *  - it isn't a WebP responsive variant (`<orig>.<w>.webp`) of a referenced original, AND
 *  - it's older than the grace window.
 * @param {{path:string, mtimeMs:number}[]} files
 * @param {Set<string>} referenced  normalised absolute paths
 */
function computeOrphans(files, referenced, now, graceMs = GRACE_MS) {
  return files
    .filter((f) => {
      const norm = path.normalize(f.path);
      if (referenced.has(norm)) return false;
      const base = norm.replace(/\.\d+\.webp$/i, "");
      if (base !== norm && referenced.has(base)) return false;
      if (now - f.mtimeMs < graceMs) return false;
      return true;
    })
    .map((f) => f.path);
}

async function buildReferencedSet() {
  const docs = await postRepository.getAllMediaUrls();
  const referenced = new Set();
  for (const d of docs) {
    const url = d.media?.url || d.mediaUrl;
    const thumb = d.media?.thumbnailUrl;
    if (url) referenced.add(path.normalize(resolveMediaPath(url)));
    if (thumb) referenced.add(path.normalize(resolveMediaPath(thumb)));
  }
  return referenced;
}

async function run() {
  if (!fs.existsSync(MEDIA_ROOT)) return;
  try {
    const referenced = await buildReferencedSet();
    const files = listFilesRecursive(MEDIA_ROOT).map((p) => ({ path: p, mtimeMs: fs.statSync(p).mtimeMs }));
    const orphans = computeOrphans(files, referenced, Date.now());
    const willDelete = process.env.ENABLE_MEDIA_CLEANUP_DELETE === "true";

    logger.info(
      { orphanCount: orphans.length, scanned: files.length, willDelete, sample: orphans.slice(0, 5) },
      "Media cleanup sweep"
    );

    if (willDelete && orphans.length) {
      let deleted = 0;
      for (const f of orphans) {
        try { fs.unlinkSync(f); deleted++; } catch (err) { logger.warn({ err: err.message, f }, "Media cleanup: delete failed"); }
      }
      logger.info({ deleted }, "Media cleanup: orphans removed");
    }
  } catch (err) {
    logger.warn({ err: err.message }, "Media cleanup run failed");
  }
}

function startMediaCleanup(schedule = process.env.MEDIA_CLEANUP_CRON || "0 3 * * *") {
  if (process.env.DISABLE_MEDIA_CLEANUP === "true") {
    logger.info("Media cleanup disabled via env");
    return null;
  }
  run().catch(() => {});
  task = cron.schedule(schedule, () => run().catch(() => {}));
  logger.info({ schedule, deleteEnabled: process.env.ENABLE_MEDIA_CLEANUP_DELETE === "true" }, "Media cleanup job scheduled");
  return task;
}

function stopMediaCleanup() {
  if (task) { task.stop(); task = null; }
}

module.exports = { startMediaCleanup, stopMediaCleanup, computeOrphans, buildReferencedSet };
