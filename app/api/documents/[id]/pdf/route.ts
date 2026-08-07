import { NextResponse } from "next/server";
import { generateResumePdf, generateTextDocumentPdf } from "@/lib/documents/generate-resume-pdf";
import { createClient } from "@/lib/supabase/server";
import { resumeAnalysisSchema } from "@/lib/ai/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid document." }, { status: 400 });
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: draft } = await supabase.from("job_document_drafts").select("id, resume_id, document_type, status, content").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!draft || draft.status !== "approved") return NextResponse.json({ error: "Only approved documents can be exported." }, { status: 403 });
  let pdf: Buffer; let name: string;
  if (draft.document_type === "resume_suggestions") {
    const { data: analysis } = await supabase.from("resume_analyses").select("structured_data").eq("resume_id", draft.resume_id).eq("user_id", user.id).maybeSingle(); const parsed = resumeAnalysisSchema.safeParse(analysis?.structured_data); if (!parsed.success) return NextResponse.json({ error: "Résumé analysis is unavailable." }, { status: 400 });
    const content = draft.content as { suggestedEdits?: Array<{ original: string; suggested: string; manualText?: string | null; decision: string }> }; pdf = await generateResumePdf(parsed.data, content.suggestedEdits ?? []); name = "jobpilot-tailored-resume.pdf";
  } else if (draft.document_type === "cover_letter") {
    const content = draft.content as { text?: string }; if (!content.text) return NextResponse.json({ error: "Cover letter is empty." }, { status: 400 }); pdf = await generateTextDocumentPdf("Cover Letter", content.text); name = "jobpilot-cover-letter.pdf";
  } else return NextResponse.json({ error: "This document type cannot be exported." }, { status: 400 });
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
