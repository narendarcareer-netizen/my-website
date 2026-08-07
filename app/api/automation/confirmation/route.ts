import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateExtension, extensionCors } from "@/lib/extension/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { addApplicationEvent, transitionApplication } from "@/lib/applications/status-machine";
import { snapshotApplicationDocuments } from "@/lib/applications/snapshot-documents";

const schema = z.object({ sessionId: z.string().uuid(), userConfirmed: z.literal(true), confidence: z.enum(["HIGH", "MEDIUM", "LOW"]), confirmationText: z.string().max(500).optional(), confirmationReference: z.string().max(200).optional(), confirmationUrl: z.string().url().max(2000).optional() });
export function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: extensionCors(request) }); }
export async function POST(request: Request) {
  const extension = await authenticateExtension(request);
  if (!extension) return NextResponse.json({ error: "Session expired" }, { status: 401, headers: extensionCors(request) });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Explicit confirmation required" }, { status: 400, headers: extensionCors(request) });
  const db = createAdminClient();
  const [{ data: session }, { data: snapshot }, { data: existing }] = await Promise.all([
    db.from("application_sessions").select("id,status,ats_type").eq("id", parsed.data.sessionId).eq("user_id", extension.user_id).eq("application_id", extension.application_id).maybeSingle(),
    db.from("application_form_snapshots").select("field_summary").eq("session_id", parsed.data.sessionId).eq("application_id", extension.application_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("application_receipts").select("id,submitted_at").eq("application_id", extension.application_id).maybeSingle(),
  ]);
  if (existing) return NextResponse.json({ ok: true, duplicate: true, submittedAt: existing.submitted_at }, { headers: extensionCors(request) });
  if (!session || session.status !== "SUBMITTING") return NextResponse.json({ error: "SUBMISSION_NOT_ACTIVE" }, { status: 409, headers: extensionCors(request) });
  await addApplicationEvent(extension.application_id, extension.user_id, "CONFIRMATION_DETECTED", { confidence: parsed.data.confidence, ats: session.ats_type }, `${session.id}:${parsed.data.confidence}`);
  await snapshotApplicationDocuments(extension.application_id, extension.user_id, { resume: extension.resume_version_id, cover_letter: extension.cover_letter_version_id });
  const submittedAt = new Date().toISOString();
  const { error } = await db.from("application_receipts").insert({ user_id: extension.user_id, application_id: extension.application_id, session_id: session.id, ats_type: session.ats_type, submitted_at: submittedAt, confirmation_text: parsed.data.confirmationText ?? null, confirmation_reference: parsed.data.confirmationReference ?? null, confirmation_url: parsed.data.confirmationUrl ?? null, field_summary: snapshot?.field_summary ?? [] });
  if (error) return NextResponse.json({ error: "RECEIPT_CREATE_FAILED" }, { status: 409, headers: extensionCors(request) });
  await transitionApplication(extension.application_id, extension.user_id, "SUBMITTED", { eventType: "SUBMISSION_CONFIRMED", data: { sessionId: session.id, confidence: parsed.data.confidence } });
  await db.from("application_sessions").update({ status: "SUBMITTED", completed_at: submittedAt }).eq("id", session.id);
  return NextResponse.json({ ok: true, submittedAt }, { headers: extensionCors(request) });
}
