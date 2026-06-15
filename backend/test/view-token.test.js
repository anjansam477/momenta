const assert = require("node:assert/strict");
const test = require("node:test");

const auth = require("../src/middleware/auth");

test("isVersionCurrent treats missing epochs as 0 (back-compat)", () => {
  assert.equal(auth.isVersionCurrent(0, 0), true);
  assert.equal(auth.isVersionCurrent(undefined, undefined), true, "pre-versioning link on a never-rotated wall");
  assert.equal(auth.isVersionCurrent(0, undefined), true, "old link, fresh wall");
  assert.equal(auth.isVersionCurrent(undefined, 0), true);
});

test("isVersionCurrent rejects a link minted before a rotation", () => {
  assert.equal(auth.isVersionCurrent(1, 0), false, "wall rotated to 1, link carries 0");
  assert.equal(auth.isVersionCurrent(2, 1), false);
});

test("isVersionCurrent accepts a link minted at the current epoch", () => {
  assert.equal(auth.isVersionCurrent(1, 1), true);
  assert.equal(auth.isVersionCurrent(3, 3), true);
});

test("receiver token round-trips email, wallId and epoch", () => {
  const token = auth.generateTokenForReceiver("recip@example.com", "wall123", 2);
  const decoded = auth.getEmailAndWallIdFromToken(token);
  assert.equal(decoded.email, "recip@example.com");
  assert.equal(decoded.wallId, "wall123");
  assert.equal(decoded.v, 2);
});

test("version defaults to 0 when minting without an epoch", () => {
  const token = auth.generateTokenForReceiver("recip@example.com", "wall123");
  const decoded = auth.getEmailAndWallIdFromToken(token);
  assert.equal(decoded.v, 0);
});

test("a tampered/garbage receiver token decodes to null", () => {
  assert.equal(auth.getEmailAndWallIdFromToken("not-a-real-jwt"), null);
});
