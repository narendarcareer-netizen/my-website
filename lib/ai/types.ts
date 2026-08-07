import { z } from "zod";

const nullableText = z.string().nullable();
export const experienceSchema = z.object({ company: nullableText, title: nullableText, startDate: nullableText, endDate: nullableText, bullets: z.array(z.string()) });
export const educationItemSchema = z.object({ institution: nullableText, degree: nullableText, field: nullableText, startDate: nullableText, endDate: nullableText });
export const resumeAnalysisSchema = z.object({
  contact: z.object({ name: nullableText, email: nullableText, phone: nullableText, location: nullableText, linkedin: nullableText, portfolio: nullableText }),
  summary: nullableText,
  skills: z.array(z.string()), experience: z.array(experienceSchema), education: z.array(educationItemSchema), certifications: z.array(z.string()),
});
export const jobAnalysisSchema = z.object({ keyResponsibilities: z.array(z.string()), requiredSkills: z.array(z.string()), preferredSkills: z.array(z.string()), seniority: nullableText, domain: nullableText, keywords: z.array(z.string()), importantQualifications: z.array(z.string()) });
export const suggestedEditSchema = z.object({ original: z.string(), suggested: z.string(), why: z.string(), sourceFact: z.string() });
export const comparisonSchema = z.object({ strengths: z.array(z.string()), gaps: z.array(z.string()), relevantExperience: z.array(z.string()), suggestedKeywords: z.array(z.string()), suggestedEdits: z.array(suggestedEditSchema), warnings: z.array(z.string()) });
export const coverLetterSchema = z.object({ text: z.string() });
export const applicationSummarySchema = z.object({ whyFits: z.array(z.string()), potentialGaps: z.array(z.string()) });

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;
export type ResumeJobComparison = z.infer<typeof comparisonSchema>;
export type SourceFacts = { userSkills: string[]; resumeExperience: ResumeAnalysis["experience"]; education: ResumeAnalysis["education"]; certifications: string[]; profile: Record<string, string | number | null>; resumeSummary: string | null };
export type ModelMetadata = { provider: "google"; model: string; inputTokens: number; outputTokens: number; responseId?: string };
export type DraftStatus = "draft" | "approved" | "rejected" | "archived";
export type PreparationState = "NOT_STARTED" | "ANALYZING" | "DRAFT_READY" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED" | "ERROR";
