const Response = require("../../utils/error-handler");
const { sanitizePostContent } = require("../../utils/sanitize-content");

const POST_CONTENT_MAX_LENGTH = 10000;
const POST_AUTHOR_NAME_MIN_LENGTH = 3;
const POST_AUTHOR_NAME_MAX_LENGTH = 50;
const POST_EMPTY_LAST_NAME = "NA";
const POST_FALLBACK_AUTHOR = "Momenta User";

const cleanName = (value) => String(value || "").trim().replace(/\s+/g, " ");
const clipName = (value) => value.slice(0, POST_AUTHOR_NAME_MAX_LENGTH);

const stripHtml = (content) => String(content || "").replace(/<(?!img)[^>]*>/g, "").trim();
const hasInlineImage = (content) => /<img[^>]*>/i.test(String(content || ""));

const nameFromEmail = (email) => {
  const localPart = String(email || "").split("@")[0] || "";
  return cleanName(localPart.replace(/[^a-zA-Z0-9 ]/g, " "));
};

function normalizePostAuthor({ firstName, lastName, email }) {
  let normalizedFirstName = cleanName(firstName);
  let normalizedLastName = cleanName(lastName);

  if (normalizedFirstName.length < POST_AUTHOR_NAME_MIN_LENGTH) {
    normalizedFirstName = nameFromEmail(email);
  }

  if (normalizedFirstName.length < POST_AUTHOR_NAME_MIN_LENGTH) {
    normalizedFirstName = POST_FALLBACK_AUTHOR;
  }

  return {
    firstName: clipName(normalizedFirstName),
    lastName: clipName(normalizedLastName || POST_EMPTY_LAST_NAME),
  };
}

function validatePostContent(content, hasFile = false) {
  const raw = content == null ? "" : String(content);

  // Reject oversized payloads before doing work.
  if (raw.length > POST_CONTENT_MAX_LENGTH) {
    throw new Error(`Post content should be ${POST_CONTENT_MAX_LENGTH} characters or less.`);
  }

  // Sanitize on write so stored content is safe regardless of how it's later
  // rendered (innerHTML, email, export). This is the server-side source of truth.
  const sanitized = sanitizePostContent(raw);
  const hasContent = stripHtml(sanitized).length > 0 || hasInlineImage(sanitized);

  if (!hasContent && !hasFile) {
    throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "content or media"));
  }

  return sanitized;
}

function normalizePostCreatePayload({ content, firstName, lastName, file, email }) {
  return {
    content: validatePostContent(content, Boolean(file)),
    ...normalizePostAuthor({ firstName, lastName, email }),
  };
}

function normalizePostUpdatePayload(updates = {}, email, currentPost = {}) {
  const normalizedUpdates = { ...updates };

  if (Object.prototype.hasOwnProperty.call(normalizedUpdates, "content")) {
    const nextMediaUrl = Object.prototype.hasOwnProperty.call(normalizedUpdates, "mediaUrl")
      ? normalizedUpdates.mediaUrl
      : currentPost.mediaUrl;
    normalizedUpdates.content = validatePostContent(
      normalizedUpdates.content,
      Boolean(nextMediaUrl && nextMediaUrl !== "#")
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalizedUpdates, "firstName") ||
    Object.prototype.hasOwnProperty.call(normalizedUpdates, "lastName")
  ) {
    const author = normalizePostAuthor({
      firstName: normalizedUpdates.firstName,
      lastName: normalizedUpdates.lastName,
      email,
    });
    normalizedUpdates.firstName = author.firstName;
    normalizedUpdates.lastName = author.lastName;
  }

  return normalizedUpdates;
}

module.exports = {
  POST_CONTENT_MAX_LENGTH,
  POST_AUTHOR_NAME_MIN_LENGTH,
  POST_AUTHOR_NAME_MAX_LENGTH,
  POST_EMPTY_LAST_NAME,
  normalizePostAuthor,
  validatePostContent,
  normalizePostCreatePayload,
  normalizePostUpdatePayload,
};
