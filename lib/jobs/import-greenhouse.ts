import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGreenhouseJobs } from "./connectors/greenhouse";
import type { ImportResult } from "@/types/database-job";
import { calculateAllUserMatches } from "@/lib/matching/calculate-user-matches";

export async function importGreenhouseJobs(companyId: string, boardIdentifier: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, unchanged: 0, closed: 0, failed: 0, errors: [] };
  const supabase = createAdminClient();
  const incoming = await fetchGreenhouseJobs(boardIdentifier);
  const { data: existing, error: lookupError } = await supabase.from("jobs").select("id, external_id, content_hash, status").eq("company_id", companyId).eq("ats_type", "greenhouse");
  if (lookupError) throw new Error("Existing jobs could not be loaded.");
  const byExternalId = new Map((existing ?? []).map(job => [job.external_id, job]));
  const seen = new Set<string>();

  for (const job of incoming) {
    seen.add(job.external_id);
    const prior = byExternalId.get(job.external_id);
    if (prior?.content_hash === job.content_hash && prior.status === "active") { result.unchanged += 1; continue; }
    const { skills, source_updated_at, ...record } = job;
    const { data: saved, error } = await supabase.from("jobs").upsert({ company_id: companyId, ...record, updated_at: source_updated_at ?? new Date().toISOString() }, { onConflict: "company_id,ats_type,external_id" }).select("id").single();
    if (error || !saved) { result.failed += 1; result.errors.push(`Could not save job ${job.external_id}.`); continue; }
    await supabase.from("job_skills").delete().eq("job_id", saved.id);
    if (skills.length) {
      const { error: skillError } = await supabase.from("job_skills").insert(skills.map(skill => ({ job_id: saved.id, skill })));
      if (skillError) result.errors.push(`Skills were not updated for job ${job.external_id}.`);
    }
    if (prior) result.updated += 1; else result.imported += 1;
  }

  const missingIds = (existing ?? []).filter(job => job.status === "active" && !seen.has(job.external_id)).map(job => job.id);
  if (missingIds.length) {
    const { error } = await supabase.from("jobs").update({ status: "closed", updated_at: new Date().toISOString() }).in("id", missingIds);
    if (error) { result.failed += missingIds.length; result.errors.push("Some missing jobs could not be marked closed."); }
    else result.closed = missingIds.length;
  }

  console.info("Greenhouse import completed", { companyId, boardIdentifier, ...result, errors: result.errors.length });
  if (result.imported || result.updated || result.closed) await calculateAllUserMatches();
  return result;
}
