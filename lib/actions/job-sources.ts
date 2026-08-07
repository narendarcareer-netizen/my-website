"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { importGreenhouseJobs } from "@/lib/jobs/import-greenhouse";
import { createAdminClient } from "@/lib/supabase/admin";
import { importSourceSchema, jobSourceSchema } from "@/lib/validation/job-source";
import type { ImportResult } from "@/types/database-job";
import { rateLimit as distributedRateLimit } from "@/lib/security/rate-limit";

export type SourceState = { error?: string; success?: string; result?: ImportResult };
const importAttempts = new Map<string, number[]>();

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function rateLimit(email: string) {
  const now = Date.now();
  const windowStart = now - 10 * 60 * 1000;
  const recent = (importAttempts.get(email) ?? []).filter(time => time > windowStart);
  if (recent.length >= 5) return false;
  recent.push(now); importAttempts.set(email, recent); return true;
}

export async function saveJobSource(_: SourceState, formData: FormData): Promise<SourceState> {
  await requireAdmin();
  const parsed = jobSourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = createAdminClient();
  const slug = slugify(parsed.data.companyName);
  if (!slug) return { error: "The company name could not be converted to a valid slug." };
  const { error } = await supabase.from("companies").upsert({ name: parsed.data.companyName, slug, website_url: parsed.data.websiteUrl || null, careers_url: parsed.data.careersUrl, ats_type: "greenhouse", ats_identifier: parsed.data.boardIdentifier, active: true }, { onConflict: "ats_type,ats_identifier" });
  if (error) return { error: "The source could not be saved. Confirm that the Phase 3 migration has been run." };
  revalidatePath("/admin/job-sources");
  return { success: "Greenhouse source saved." };
}

export async function runJobImport(_: SourceState, formData: FormData): Promise<SourceState> {
  const admin = await requireAdmin();
  const parsed = importSourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "The selected source is invalid." };
  if (!rateLimit(admin.email!.toLowerCase()) || !(await distributedRateLimit("admin-import",admin.id,5,600)).success) return { error: "Import limit reached. Wait ten minutes before trying again." };
  try {
    const result = await importGreenhouseJobs(parsed.data.companyId, parsed.data.boardIdentifier);
    revalidatePath("/jobs"); revalidatePath("/admin/job-sources");
    return { success: "Import completed.", result };
  } catch (error) {
    console.warn("Greenhouse import failed", { boardIdentifier: parsed.data.boardIdentifier, errorType: error instanceof Error ? error.name : "UnknownError" });
    return { error: error instanceof Error ? error.message : "The import failed. Please try again." };
  }
}
