import "server-only";
import { generateStructured } from "@/lib/gemini/client";
import { normalizeSkills } from "@/lib/matching/normalize-skill";
import { extractResumeText } from "@/lib/resume/extract-text";
import { createAdminClient } from "@/lib/supabase/admin";
import { resumeAnalysisSchema, type ResumeAnalysis } from "./types";
import { enforceAiRateLimit } from "./rate-limit";
import { recordAiUsage } from "./usage";

function grounded(value: string | null, source: string) { return value && source.toLowerCase().includes(value.toLowerCase()) ? value : null; }

export async function analyzeResume(userId: string, resumeId: string): Promise<{ analysis: ResumeAnalysis; parsedText: string; analysisId: string }> {
  enforceAiRateLimit(userId, "resume_analysis");
  const supabase = createAdminClient();
  const { data: resume } = await supabase.from("resumes").select("id, user_id, file_name, storage_path").eq("id", resumeId).eq("user_id", userId).maybeSingle();
  if (!resume) throw new Error("MISSING_RESUME");
  const { data: file, error } = await supabase.storage.from("resumes").download(resume.storage_path);
  if (error || !file) throw new Error("RESUME_DOWNLOAD_FAILED");
  const parsedText = await extractResumeText(resume.file_name, await file.arrayBuffer());
  const prompt = `Extract structured facts from the resume text below. Copy names, employers, titles, dates, degrees, certifications, and bullet facts only when explicitly present. Use null for uncertain scalar fields and empty arrays for missing lists. Do not improve, rewrite, or infer facts.\n\n<resume_text>\n${parsedText}\n</resume_text>`;
  const result = await generateStructured("resume analysis", prompt, resumeAnalysisSchema);
  const analysis: ResumeAnalysis = { ...result.data, contact: Object.fromEntries(Object.entries(result.data.contact).map(([key, value]) => [key, grounded(value, parsedText)])) as ResumeAnalysis["contact"], skills: result.data.skills.filter(skill => parsedText.toLowerCase().includes(skill.toLowerCase())), experience: result.data.experience.map(item => ({ ...item, company: grounded(item.company, parsedText), title: grounded(item.title, parsedText), startDate: grounded(item.startDate, parsedText), endDate: grounded(item.endDate, parsedText), bullets: item.bullets.filter(bullet => bullet.length <= 500) })), education: result.data.education.map(item => ({ ...item, institution: grounded(item.institution, parsedText), degree: grounded(item.degree, parsedText), field: grounded(item.field, parsedText), startDate: grounded(item.startDate, parsedText), endDate: grounded(item.endDate, parsedText) })), certifications: result.data.certifications.filter(item => parsedText.toLowerCase().includes(item.toLowerCase())) };
  const { data: saved, error: saveError } = await supabase.from("resume_analyses").upsert({ user_id: userId, resume_id: resumeId, parsed_text: parsedText, structured_data: analysis, skills: normalizeSkills(analysis.skills), experience: analysis.experience, education: analysis.education, certifications: analysis.certifications }, { onConflict: "user_id,resume_id" }).select("id").single();
  if (saveError || !saved) throw new Error("ANALYSIS_SAVE_FAILED");
  const skills = normalizeSkills(analysis.skills); if (skills.length) await supabase.from("user_skills").upsert(skills.map(skill => ({ user_id: userId, skill, source: "resume", confidence: .9 })), { onConflict: "user_id,skill" });
  await recordAiUsage(userId, "resume_analysis", result.metadata);
  return { analysis, parsedText, analysisId: saved.id };
}
