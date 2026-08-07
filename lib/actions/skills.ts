"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateUserMatches } from "@/lib/matching/calculate-user-matches";
import { normalizeSkill } from "@/lib/matching/normalize-skill";
import { createClient } from "@/lib/supabase/server";

export type SkillState = { error?: string; success?: string; summary?: { jobsEvaluated: number; matchesCreated: number; matchesUpdated: number; failures: number } };
const skillSchema = z.string().trim().min(1, "Enter a skill.").max(100);

async function userContext() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return user ? { supabase, user } : null;
}

export async function addSkill(_: SkillState, formData: FormData): Promise<SkillState> {
  const parsed = skillSchema.safeParse(formData.get("skill"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const skill = normalizeSkill(parsed.data); if (!skill) return { error: "Enter a valid skill." };
  const context = await userContext(); if (!context) return { error: "Your session expired." };
  const { error } = await context.supabase.from("user_skills").insert({ user_id: context.user.id, skill, source: "manual", confidence: 1 });
  if (error?.code === "23505") return { error: "That skill is already in your profile." };
  if (error) return { error: "The skill could not be added. Confirm the Phase 4 migration is installed." };
  const summary = await calculateUserMatches(context.user.id);
  revalidatePath("/profile"); revalidatePath("/jobs"); revalidatePath("/dashboard");
  return { success: "Skill added and matches recalculated.", summary };
}

export async function removeSkill(formData: FormData) {
  const id = formData.get("id"); if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) return;
  const context = await userContext(); if (!context) return;
  await context.supabase.from("user_skills").delete().eq("id", id).eq("user_id", context.user.id);
  await calculateUserMatches(context.user.id);
  revalidatePath("/profile"); revalidatePath("/jobs"); revalidatePath("/dashboard");
}

export async function recalculateMyMatches(_: SkillState, formData: FormData): Promise<SkillState> {
  void formData;
  const context = await userContext(); if (!context) return { error: "Your session expired." };
  try { const summary = await calculateUserMatches(context.user.id); revalidatePath("/jobs"); revalidatePath("/dashboard"); return { success: "Matches recalculated.", summary }; }
  catch { return { error: "Matches could not be recalculated. Confirm the Phase 4 migration and try again." }; }
}
