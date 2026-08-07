import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resumeMetadataSchema } from "@/lib/validation/profile";
import { calculateUserMatches } from "@/lib/matching/calculate-user-matches";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("resume");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a résumé file to upload." }, { status: 400 });

    const parsed = resumeMetadataSchema.safeParse({ fileName: file.name, size: file.size, type: file.type });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180);
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, file, { contentType: parsed.data.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "Upload failed. Confirm that the private resumes bucket and policies are configured." }, { status: 400 });

    const { error: recordError } = await supabase.from("resumes").insert({ user_id: user.id, file_name: parsed.data.fileName, storage_path: storagePath, is_primary: false });
    if (recordError) {
      await supabase.storage.from("resumes").remove([storagePath]);
      return NextResponse.json({ error: "The file uploaded, but its record could not be saved. Please try again." }, { status: 400 });
    }

    try { await calculateUserMatches(user.id); } catch { /* Upload succeeds even before Phase 4 setup. */ }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "The upload could not be processed. Please try again." }, { status: 500 });
  }
}
