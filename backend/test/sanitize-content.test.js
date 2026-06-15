const assert = require("node:assert/strict");
const test = require("node:test");

const { sanitizePostContent } = require("../src/utils/sanitize-content");
const { validatePostContent } = require("../src/domain/posts/post-rules");

test("strips script tags", () => {
  assert.ok(!sanitizePostContent("<p>hi</p><script>alert(1)</script>").includes("script"));
});

test("strips event handlers but keeps the image", () => {
  const out = sanitizePostContent('<img src="x" onerror="alert(1)">');
  assert.ok(out.includes("<img"));
  assert.ok(!out.toLowerCase().includes("onerror"));
});

test("drops javascript: links", () => {
  const out = sanitizePostContent('<a href="javascript:alert(1)">x</a>');
  assert.ok(!out.toLowerCase().includes("javascript:"));
});

test("keeps safe formatting", () => {
  const out = sanitizePostContent("<p>Happy <strong>birthday</strong> <em>Sam</em>!</p>");
  assert.ok(out.includes("<strong>birthday</strong>"));
  assert.ok(out.includes("<em>Sam</em>"));
});

test("allows inline base64 images", () => {
  const out = sanitizePostContent('<img src="data:image/png;base64,iVBORw0KGgo=">');
  assert.ok(out.includes("data:image/png;base64"));
});

test("validatePostContent returns sanitized content and accepts clean text", () => {
  const out = validatePostContent('<p>Hello</p><img src=x onerror=alert(1)>', false);
  assert.ok(!out.toLowerCase().includes("onerror"));
  assert.ok(out.includes("<p>Hello</p>"));
});

test("validatePostContent rejects empty content with no file", () => {
  assert.throws(() => validatePostContent("<script>alert(1)</script>", false));
});
