import "server-only";
import { generateStructured } from "@/lib/gemini/client";
import { comparisonSchema, type JobAnalysis, type SourceFacts } from "./types";
import { filterGroundedSuggestedEdits } from "./grounding";

export async function compareResumeJob(parsedText: string, sourceFacts: SourceFacts, jobAnalysis: JobAnalysis) {
  const prompt = `Compare the verified source facts with the job analysis. You may only use facts in source_facts and exact text from original_resume. Unsupported job requirements must be gaps. Every suggested edit must include an exact original substring, a conservative rewrite, why it helps, and the exact source fact supporting every added detail. Never add metrics or context not in the sources.\n\nsource_facts:\n${JSON.stringify(sourceFacts)}\n\njob_analysis:\n${JSON.stringify(jobAnalysis)}\n\n<original_resume>\n${parsedText}\n</original_resume>`;
  const result = await generateStructured("resume and job comparison", prompt, comparisonSchema);
  result.data = filterGroundedSuggestedEdits(result.data, parsedText, sourceFacts);
  return result;
}
