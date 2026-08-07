import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { filterGroundedSuggestedEdits } from "../lib/ai/grounding";
import { generateResumePdf } from "../lib/documents/generate-resume-pdf";
import type { ResumeAnalysis, ResumeJobComparison, SourceFacts } from "../lib/ai/types";

const parsedText = "Narendar Example\nBuilt frontend features using React and TypeScript.\nNew York, NY";
const sourceFacts: SourceFacts = {
  profile: { fullName: "Narendar Example", location: "New York, NY" },
  userSkills: ["React", "TypeScript"],
  resumeExperience: [{ company: "Example Co", title: "Frontend Engineer", startDate: null, endDate: null, bullets: ["Built frontend features using React and TypeScript."] }],
  education: [],
  certifications: [],
  resumeSummary: null,
};
const comparison: ResumeJobComparison = {
  strengths: [], gaps: [], relevantExperience: [], suggestedKeywords: [], warnings: [],
  suggestedEdits: [
    { original: "Built frontend features using React and TypeScript.", suggested: "Built frontend features using React and TypeScript.", why: "Highlights relevant tools.", sourceFact: "React" },
    { original: "Built frontend features using React and TypeScript.", suggested: "Increased revenue by 40% using React.", why: "Adds impact.", sourceFact: "React" },
    { original: "Built frontend features using React and TypeScript.", suggested: "Built AWS services.", why: "Matches AWS.", sourceFact: "AWS" },
  ],
};

const grounded = filterGroundedSuggestedEdits(comparison, parsedText, sourceFacts);
assert.equal(grounded.suggestedEdits.length, 1, "unsupported metrics and facts must be rejected");

const analysis: ResumeAnalysis = {
  contact: { name: "Narendar Example", email: null, phone: null, location: "New York, NY", linkedin: null, portfolio: null },
  summary: null,
  skills: ["React", "TypeScript"],
  experience: sourceFacts.resumeExperience,
  education: [],
  certifications: [],
};
async function main() {
  const pdf = await generateResumePdf(analysis, [{ ...grounded.suggestedEdits[0], decision: "accepted" }]);
  assert.ok(pdf.length > 1_000, "generated PDF should contain a complete document");
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/jobpilot-sample-tailored-resume.pdf", pdf);
  console.log("AI grounding and PDF tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
