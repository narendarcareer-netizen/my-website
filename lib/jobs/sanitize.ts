import "server-only";
import sanitizeHtml from "sanitize-html";

export function sanitizeJobDescription(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "h2", "h3", "h4", "a", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
  });
}
