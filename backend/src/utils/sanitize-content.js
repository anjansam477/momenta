const sanitizeHtml = require("sanitize-html");

/**
 * Allow-list for rich post content produced by the Quill editor. Anything not
 * listed is dropped. Crucially this strips <script>, event handlers (onerror,
 * onclick, …), javascript: URLs and unknown tags, so stored content is safe no
 * matter how it is later rendered (innerHTML, email, export, height-measuring).
 *
 * This is the server-side source of truth — the client sanitiser is only a
 * second line of defence.
 */
const POST_OPTIONS = {
  allowedTags: [
    "p", "br", "span", "div", "strong", "b", "em", "i", "u", "s", "strike",
    "sub", "sup", "blockquote", "ol", "ul", "li", "h1", "h2", "h3", "h4", "h5",
    "h6", "pre", "code", "a", "img", "hr",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "style"],
    span: ["style", "class"],
    p: ["style", "class"],
    div: ["style", "class"],
    "*": ["class"],
  },
  // Links: only safe schemes. Images may also be inline data: URIs (base64).
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedStyles: {
    "*": {
      color: [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      "background-color": [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      "text-align": [/^left$|^right$|^center$|^justify$/],
      "font-size": [/^\d+(?:px|em|rem|%)$/],
    },
  },
  // Force outbound links to be safe and not leak the referrer.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
  },
  disallowedTagsMode: "discard",
};

/** Sanitize rich post content. Returns a clean HTML string (never null). */
function sanitizePostContent(content) {
  if (content == null) return "";
  return sanitizeHtml(String(content), POST_OPTIONS);
}

module.exports = { sanitizePostContent };
