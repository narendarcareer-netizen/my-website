import sanitizeHtml from "sanitize-html";
import { normalizeSkills } from "./normalize-skill";

const dictionary: Record<string, string[]> = {
  javascript: ["javascript", "js"], typescript: ["typescript", "ts"], react: ["react", "react.js", "reactjs"], "next.js": ["next.js", "nextjs"], vue: ["vue", "vue.js"], angular: ["angular"], "node.js": ["node.js", "nodejs"], python: ["python"], java: ["java"], "c#": ["c#", "c sharp"], go: ["golang"], rust: ["rust"], php: ["php"], ruby: ["ruby"], sql: ["sql"], postgresql: ["postgresql", "postgres"], mysql: ["mysql"], mongodb: ["mongodb"], redis: ["redis"], graphql: ["graphql"], rest: ["rest api", "restful"], aws: ["aws", "amazon web services"], azure: ["azure"], gcp: ["gcp", "google cloud"], docker: ["docker"], kubernetes: ["kubernetes", "k8s"], terraform: ["terraform"], git: ["git"], github: ["github"], "ci/cd": ["ci/cd", "continuous integration"], linux: ["linux"], figma: ["figma"], salesforce: ["salesforce"],
};

function escapedTerm(term: string) { return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function extractJobSkills(title: string, description: string) {
  const text = `${title} ${sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} })}`.toLowerCase();
  const found = Object.entries(dictionary).filter(([, terms]) => terms.some(term => new RegExp(`(^|[^a-z0-9+#])${escapedTerm(term)}([^a-z0-9+#]|$)`, "i").test(text))).map(([skill]) => skill);
  return normalizeSkills(found);
}
