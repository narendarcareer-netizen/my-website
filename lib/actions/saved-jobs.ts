"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error?: string; saved?: boolean };

export async function toggleSavedJob(jobId: string, currentlySaved: boolean, previousState: SaveState): Promise<SaveState> {
  void previousState;
  const parsed = z.string().uuid().safeParse(jobId);
  if (!parsed.success) return { error: "This job could not be saved." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save jobs." };
  const query = supabase.from("saved_jobs");
  const { error } = currentlySaved
    ? await query.delete().eq("user_id", user.id).eq("job_id", parsed.data)
    : await query.upsert({ user_id: user.id, job_id: parsed.data }, { onConflict: "user_id,job_id" });
  if (error) return { error: "Your saved jobs could not be updated." };
  revalidatePath(`/jobs/${parsed.data}`);
  return { saved: !currentlySaved };
}
