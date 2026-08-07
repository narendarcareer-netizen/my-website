import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateExtension, extensionCors } from "@/lib/extension/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { addApplicationEvent } from "@/lib/applications/status-machine";
import { approvalToken, approvalTokenHash, automationTestMode } from "@/lib/automation/security";

const schema = z.object({ sessionId: z.string().uuid(), formHash: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true) });
export function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: extensionCors(request) }); }

export async function POST(request: Request) {
  const extension = await authenticateExtension(request);
  if (!extension) return NextResponse.json({ error: "Session expired" }, { status: 401, headers: extensionCors(request) });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Explicit confirmation required" }, { status: 400, headers: extensionCors(request) });
  const db = createAdminClient();
  const now = new Date();
  const [{ data: session }, { data: snapshot }, { data: application }, { data: receipt }] = await Promise.all([
    db.from("application_sessions").select("id,status,expires_at").eq("id", parsed.data.sessionId).eq("application_id", extension.application_id).eq("user_id", extension.user_id).maybeSingle(),
    db.from("application_form_snapshots").select("id").eq("session_id", parsed.data.sessionId).eq("application_id", extension.application_id).eq("form_hash", parsed.data.formHash).maybeSingle(),
    db.from("applications").select("status").eq("id", extension.application_id).eq("user_id", extension.user_id).maybeSingle(),
    db.from("application_receipts").select("id").eq("application_id", extension.application_id).maybeSingle(),
  ]);
  if (!session || !snapshot || session.status !== "READY_FOR_REVIEW") return NextResponse.json({ error: "FORM_CHANGED" }, { status: 409, headers: extensionCors(request) });
  if (new Date(session.expires_at) <= now) return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 409, headers: extensionCors(request) });
  if (!application || application.status === "SUBMITTED" || receipt) return NextResponse.json({ error: "DUPLICATE_SUBMISSION" }, { status: 409, headers: extensionCors(request) });
  const token = approvalToken();
  const expiresAt = new Date(now.getTime() + 5 * 60_000).toISOString();
  await db.from("submission_approval_tokens").delete().eq("application_id", extension.application_id).is("used_at", null);
  const { error } = await db.from("submission_approval_tokens").insert({ user_id: extension.user_id, application_id: extension.application_id, session_id: session.id, form_snapshot_hash: parsed.data.formHash, token_hash: approvalTokenHash(token), expires_at: expiresAt });
  if (error) return NextResponse.json({ error: "APPROVAL_FAILED" }, { status: 409, headers: extensionCors(request) });
  await db.from("application_sessions").update({ status: "APPROVED_TO_SUBMIT" }).eq("id", session.id);
  await addApplicationEvent(extension.application_id, extension.user_id, "SUBMISSION_APPROVED", { sessionId: session.id, expiresAt }, parsed.data.formHash);
  return NextResponse.json({ approvalToken: token, expiresAt, testMode: automationTestMode() }, { headers: extensionCors(request) });
}
