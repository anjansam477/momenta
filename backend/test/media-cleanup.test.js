const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("path");

const { computeOrphans } = require("../src/jobs/media-cleanup");

const ROOT = path.normalize("/root/media-files");
const now = Date.UTC(2026, 0, 1);
const OLD = now - 48 * 60 * 60 * 1000; // 2 days old (past grace)
const NEW = now - 60 * 1000;           // 1 min old (within grace)

test("flags an unreferenced, old file as orphan", () => {
  const files = [{ path: path.join(ROOT, "w/p/orphan.jpg"), mtimeMs: OLD }];
  const referenced = new Set();
  assert.deepEqual(computeOrphans(files, referenced, now), [path.join(ROOT, "w/p/orphan.jpg")]);
});

test("keeps a referenced file", () => {
  const f = path.join(ROOT, "w/p/live.jpg");
  const files = [{ path: f, mtimeMs: OLD }];
  const referenced = new Set([path.normalize(f)]);
  assert.deepEqual(computeOrphans(files, referenced, now), []);
});

test("keeps a webp variant of a referenced original", () => {
  const orig = path.join(ROOT, "w/p/live.jpg");
  const variant = `${orig}.480.webp`;
  const files = [{ path: variant, mtimeMs: OLD }];
  const referenced = new Set([path.normalize(orig)]);
  assert.deepEqual(computeOrphans(files, referenced, now), [], "variant of a live image must not be flagged");
});

test("flags a variant whose original is gone", () => {
  const variant = path.join(ROOT, "w/p/dead.jpg.480.webp");
  const files = [{ path: variant, mtimeMs: OLD }];
  assert.deepEqual(computeOrphans(files, new Set(), now), [variant]);
});

test("never touches files inside the grace window", () => {
  const files = [{ path: path.join(ROOT, "w/p/fresh.jpg"), mtimeMs: NEW }];
  assert.deepEqual(computeOrphans(files, new Set(), now), [], "in-flight uploads must be left alone");
});
