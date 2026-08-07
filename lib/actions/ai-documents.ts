"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prepareApplication } from "@/lib/ai/prepare-application";
import { createClient } from "@/lib/supabase/server";
import { syncApplicationReadinessForJob } from "@/lib/applications/check-readiness";

export type AiActionState = { error?: string; success?: string };
const idsSchema = z.object({ jobId: z.string().uuid(), resumeId: z.string().uuid() });

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "AI_RATE_LIMIT") return "You’ve reached the hourly AI limit. Please try again later.";
  if (message.includes("configured")) return "Gemini is not configured. Add GEMINI_API_KEY to the root .env.local file.";
  if (/API key is invalid|model access/i.test(message)) return "The Gemini API key is invalid or does not have access to the configured model.";
  if (/model is unavailable/i.test(message)) return "The configured Gemini model is unavailable. Update the server model and try again.";
  if (/quota/i.test(message)) return "Gemini's quota is temporarily unavailable. Please try again later.";
  if (message === "RESUME_DOWNLOAD_FAILED") return "The resume could not be downloaded from private storage.";
  if (message === "ANALYSIS_SAVE_FAILED" || message === "DRAFT_SAVE_FAILED") return "The AI document tables could not save the result. Confirm the Phase 5 migration has been run.";
  if (/Only PDF and DOCX|No readable text|5 MB/i.test(message)) return message;
  if (message === "MISSING_RESUME") return "Choose an uploaded résumé first.";
  if (message === "JOB_DESCRIPTION_MISSING") return "This job does not include enough description text to analyze.";
  if (/timeout|too long/i.test(message)) return "Gemini took too long to respond. Please try again.";
  return "Preparation could not be completed. Please try again.";
}

async function currentUser() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return user; }

export async function generateApplicationDrafts(_: AiActionState, formData: FormData): Promise<AiActionState> {
  const parsed = idsSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "Select a valid résumé and job." };
  const user = await currentUser(); if (!user) return { error: "Your session expired." };
  try { await prepareApplication(user.id, parsed.data.jobId, parsed.data.resumeId, false); revalidatePath(`/jobs/${parsed.data.jobId}/prepare`); return { success: "Drafts are ready for your review." }; }
  catch (error) { return { error: safeError(error) }; }
}

export async function regenerateApplicationDrafts(_: AiActionState, formData: FormData): Promise<AiActionState> {
  const parsed = idsSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "Select a valid résumé and job." };
  const user = await currentUser(); if (!user) return { error: "Your session expired." };
  try { await prepareApplication(user.id, parsed.data.jobId, parsed.data.resumeId, true); revalidatePath(`/jobs/${parsed.data.jobId}/prepare`); return { success: "New versions are ready for review." }; }
  catch (error) { return { error: safeError(error) }; }
}

const draftUpdateSchema = z.object({ draftId: z.string().uuid(), jobId: z.string().uuid(), content: z.string().max(30_000) });
export async function saveTextDraft(_: AiActionState, formData: FormData): Promise<AiActionState> {
  const parsed = draftUpdateSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "The draft is invalid or too long." };
  const user = await currentUser(); if (!user) return { error: "Your session expired." }; const supabase = await createClient();
  const { data: draft } = await supabase.from("job_document_drafts").select("id, document_type").eq("id", parsed.data.draftId).eq("user_id", user.id).maybeSingle(); if (!draft) return { error: "Draft not found." };
  const content = { text: parsed.data.content }; const { error } = await supabase.from("job_document_drafts").update({ content, status: "draft", approved_at: null }).eq("id", draft.id).eq("user_id", user.id);
  if (error) return { error: "The draft could not be saved." };
  const { data: last } = await supabase.from("document_versions").select("version_number").eq("document_draft_id", draft.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("document_versions").insert({ document_draft_id: draft.id, version_number: (last?.version_number ?? 0) + 1, content }); revalidatePath(`/jobs/${parsed.data.jobId}/prepare`); return { success: "Draft saved as a new version." };
}

const decisionSchema = z.object({ draftId: z.string().uuid(), jobId: z.string().uuid(), index: z.coerce.number().int().min(0).max(200), decision: z.enum(["accepted", "rejected", "pending"]), manualText: z.string().max(2000).optional() });
export async function updateSuggestionDecision(formData: FormData) {
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await currentUser(); if (!user) return; const supabase = await createClient();
  const { data: draft } = await supabase.from("job_document_drafts").select("content").eq("id", parsed.data.draftId).eq("user_id", user.id).eq("document_type", "resume_suggestions").maybeSingle();
  const content = draft?.content as { suggestedEdits?: Array<Record<string, unknown>> } | null; if (!content?.suggestedEdits?.[parsed.data.index]) return;
  content.suggestedEdits[parsed.data.index] = { ...content.suggestedEdits[parsed.data.index], decision: parsed.data.decision, manualText: parsed.data.manualText?.trim() || null };
  await supabase.from("job_document_drafts").update({ content, status: "draft", approved_at: null }).eq("id", parsed.data.draftId).eq("user_id", user.id); revalidatePath(`/jobs/${parsed.data.jobId}/prepare`);
}

const statusSchema = z.object({ draftId: z.string().uuid(), jobId: z.string().uuid(), status: z.enum(["approved", "rejected"]) });
export async function updateDraftStatus(formData: FormData) {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return;
  const user = await currentUser(); if (!user) return; const supabase = await createClient();
  await supabase.from("job_document_drafts").update({ status: parsed.data.status, approved_at: parsed.data.status === "approved" ? new Date().toISOString() : null }).eq("id", parsed.data.draftId).eq("user_id", user.id); await syncApplicationReadinessForJob(user.id,parsed.data.jobId); revalidatePath(`/jobs/${parsed.data.jobId}/prepare`); revalidatePath("/applications"); revalidatePath("/tracker");
}
