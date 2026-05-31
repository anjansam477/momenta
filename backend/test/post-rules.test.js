const assert = require("node:assert/strict");
const test = require("node:test");

const {
  POST_CONTENT_MAX_LENGTH,
  POST_EMPTY_LAST_NAME,
  normalizePostAuthor,
  normalizePostCreatePayload,
  normalizePostUpdatePayload,
  validatePostContent,
} = require("../src/domain/posts/post-rules");

test("normalizePostAuthor stores missing last names as NA", () => {
  const author = normalizePostAuthor({
    firstName: "Aman",
    lastName: "",
    email: "aman@example.com",
  });

  assert.deepEqual(author, {
    firstName: "Aman",
    lastName: POST_EMPTY_LAST_NAME,
  });
});

test("normalizePostAuthor falls back to email or safe product name for short names", () => {
  assert.equal(normalizePostAuthor({ firstName: "V", email: "v-anian@example.com" }).firstName, "v anian");
  assert.equal(normalizePostAuthor({ firstName: "V", email: "v@x.io" }).firstName, "Momenta User");
});

test("validatePostContent rejects empty posts without media but allows media-only posts", () => {
  assert.throws(
    () => validatePostContent("<p><br></p>", false),
    /content or media required/
  );

  assert.equal(validatePostContent("", true), "");
});

test("validatePostContent rejects oversized post bodies", () => {
  assert.throws(
    () => validatePostContent("x".repeat(POST_CONTENT_MAX_LENGTH + 1), false),
    /10000 characters or less/
  );
});

test("normalizers keep payload shape while applying shared post rules", () => {
  const createPayload = normalizePostCreatePayload({
    content: "hello",
    firstName: "Aman",
    lastName: undefined,
    file: null,
    email: "aman@example.com",
  });
  const updatePayload = normalizePostUpdatePayload({
    content: "updated",
    firstName: "Bo",
    lastName: "",
  }, "board-owner@example.com");

  assert.deepEqual(createPayload, {
    content: "hello",
    firstName: "Aman",
    lastName: POST_EMPTY_LAST_NAME,
  });
  assert.equal(updatePayload.content, "updated");
  assert.equal(updatePayload.firstName, "board owner");
  assert.equal(updatePayload.lastName, POST_EMPTY_LAST_NAME);
});

test("update normalizer allows empty text when an existing media attachment remains", () => {
  const updatePayload = normalizePostUpdatePayload(
    { content: "" },
    "author@example.com",
    { mediaUrl: "/uploads/post/image.png" }
  );

  assert.equal(updatePayload.content, "");
});
