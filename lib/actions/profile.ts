"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { jobPreferencesSchema, profileSchema, workAuthorizationSchema } from "@/lib/validation/profile";
import { calculateUserMatches } from "@/lib/matching/calculate-user-matches";

export type FormState = { error?: string; success?: string };
async function refreshMatches(userId: string) { try { await calculateUserMatches(userId); } catch { /* Phase 4 may not be configured yet. */ } }

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const auth = await authenticatedClient();
  if (!auth) return { error: "Your session expired. Please sign in again." };
  const { error } = await auth.supabase.from("profiles").upsert({ id: auth.user.id, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) return { error: "We could not save your profile. Please try again." };
  await refreshMatches(auth.user.id);
  revalidatePath("/profile");
  return { success: "Profile saved." };
}

export async function updateJobPreferences(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = jobPreferencesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const auth = await authenticatedClient();
  if (!auth) return { error: "Your session expired. Please sign in again." };
  const { error } = await auth.supabase.from("job_preferences").upsert({ user_id: auth.user.id, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "We could not save your job preferences. Please try again." };
  await refreshMatches(auth.user.id);
  revalidatePath("/profile");
  return { success: "Job preferences saved." };
}

export async function addWorkAuthorization(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = workAuthorizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const auth = await authenticatedClient();
  if (!auth) return { error: "Your session expired. Please sign in again." };
  const { error } = await auth.supabase.from("work_authorizations").insert({ user_id: auth.user.id, ...parsed.data });
  if (error) return { error: "We could not add that authorization. Please try again." };
  await refreshMatches(auth.user.id);
  revalidatePath("/profile");
  return { success: "Work authorization added." };
}

export async function deleteWorkAuthorization(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const auth = await authenticatedClient();
  if (!auth) return;
  await auth.supabase.from("work_authorizations").delete().eq("id", id).eq("user_id", auth.user.id);
  await refreshMatches(auth.user.id);
  revalidatePath("/profile");
}

export async function deleteResume(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const auth = await authenticatedClient();
  if (!auth) return;
  const { data } = await auth.supabase.from("resumes").select("storage_path").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!data) return;
  const { error } = await auth.supabase.storage.from("resumes").remove([data.storage_path]);
  if (!error) await auth.supabase.from("resumes").delete().eq("id", id).eq("user_id", auth.user.id);
  await refreshMatches(auth.user.id);
  revalidatePath("/profile");
}
