import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateJobMatch } from "./calculate-job-match";
import { extractJobSkills } from "./extract-job-skills";
import { normalizeSkills } from "./normalize-skill";
import type { MatchCalculationSummary, MatchJob, MatchUser } from "./types";

export async function calculateUserMatches(userId: string): Promise<MatchCalculationSummary> {
  const summary: MatchCalculationSummary = { jobsEvaluated: 0, matchesCreated: 0, matchesUpdated: 0, failures: 0, errors: [] };
  const supabase = createAdminClient();
  const [preferencesResult, skillsResult, authorizationsResult, jobsResult, existingResult] = await Promise.all([
    supabase.from("job_preferences").select("preferred_titles, preferred_locations, remote_preference, employment_types, minimum_salary, salary_currency").eq("user_id", userId).maybeSingle(),
    supabase.from("user_skills").select("skill").eq("user_id", userId),
    supabase.from("work_authorizations").select("country, authorization_type, requires_sponsorship").eq("user_id", userId),
    supabase.from("jobs").select("id, title, description, location, workplace_type, employment_type, salary_min, salary_max, salary_currency, job_skills(skill)").eq("status", "active"),
    supabase.from("job_matches").select("job_id").eq("user_id", userId),
  ]);
  if (jobsResult.error) throw new Error("Active jobs could not be loaded for matching.");
  const preferences = preferencesResult.data;
  const user: MatchUser = {
    skills: normalizeSkills((skillsResult.data ?? []).map(item => item.skill)),
    preferredTitles: preferences?.preferred_titles ?? [], preferredLocations: preferences?.preferred_locations ?? [], remotePreference: preferences?.remote_preference ?? null,
    employmentTypes: preferences?.employment_types ?? [], minimumSalary: preferences?.minimum_salary ?? null, salaryCurrency: preferences?.salary_currency ?? null,
    workAuthorizations: (authorizationsResult.data ?? []).map(item => ({ country: item.country, authorizationType: item.authorization_type, requiresSponsorship: item.requires_sponsorship })),
  };
  const existingIds = new Set((existingResult.data ?? []).map(item => item.job_id));
  const rows = [];
  for (const record of jobsResult.data ?? []) {
    const extracted = extractJobSkills(record.title, record.description);
    const stored = normalizeSkills((record.job_skills ?? []).map(item => item.skill));
    const skills = normalizeSkills([...stored, ...extracted]);
    const missingStored = skills.filter(skill => !stored.includes(skill));
    if (missingStored.length) await supabase.from("job_skills").upsert(missingStored.map(skill => ({ job_id: record.id, skill })), { onConflict: "job_id,skill" });
    const job: MatchJob = { id: record.id, title: record.title, description: record.description, location: record.location, workplaceType: record.workplace_type, employmentType: record.employment_type, salaryMin: record.salary_min, salaryMax: record.salary_max, salaryCurrency: record.salary_currency, skills };
    rows.push({ user_id: userId, ...calculateJobMatch(user, job), calculated_at: new Date().toISOString() });
    if (existingIds.has(record.id)) summary.matchesUpdated += 1; else summary.matchesCreated += 1;
  }
  summary.jobsEvaluated = rows.length;
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const { error } = await supabase.from("job_matches").upsert(batch, { onConflict: "user_id,job_id" });
    if (error) { summary.failures += batch.length; summary.errors.push(`A batch of ${batch.length} matches could not be saved.`); }
  }
  return summary;
}

export async function calculateAllUserMatches() {
  const supabase = createAdminClient();
  const { data: profiles } = await supabase.from("profiles").select("id");
  for (const profile of profiles ?? []) {
    try { await calculateUserMatches(profile.id); }
    catch { console.warn("Background match calculation failed", { operation: "recalculate-user-matches" }); }
  }
}
