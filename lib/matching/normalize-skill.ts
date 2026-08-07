const aliases: Record<string, string> = {
  js: "javascript", javascript: "javascript",
  ts: "typescript", typescript: "typescript",
  "react.js": "react", reactjs: "react", react: "react",
  "next.js": "next.js", nextjs: "next.js",
  "node.js": "node.js", nodejs: "node.js", node: "node.js",
  postgres: "postgresql", postgresql: "postgresql",
  "c sharp": "c#", csharp: "c#", "c#": "c#",
  golang: "go", go: "go",
  k8s: "kubernetes", kubernetes: "kubernetes",
  gcp: "gcp", "google cloud": "gcp",
  aws: "aws", "amazon web services": "aws",
  cicd: "ci/cd", "ci cd": "ci/cd", "ci/cd": "ci/cd",
};

export function normalizeSkill(value: string) {
  const cleaned = value.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^a-z0-9+#./ -]/g, "");
  return aliases[cleaned] ?? cleaned;
}

export function skillDisplayName(value: string) {
  const normalized = normalizeSkill(value);
  const display: Record<string, string> = { javascript: "JavaScript", typescript: "TypeScript", react: "React", "next.js": "Next.js", "node.js": "Node.js", postgresql: "PostgreSQL", "c#": "C#", go: "Go", "ci/cd": "CI/CD", gcp: "GCP", aws: "AWS" };
  return display[normalized] ?? normalized.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function normalizeSkills(values: string[]) {
  return [...new Set(values.map(normalizeSkill).filter(Boolean))];
}
