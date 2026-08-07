import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateExtension, extensionCors } from "@/lib/extension/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { addApplicationEvent, transitionApplication } from "@/lib/applications/status-machine";
import { formReviewSchema, sanitizedSnapshot, validateReview } from "@/lib/automation/schema";
import { approvalTokenHash, automationTestMode, stableHash } from "@/lib/automation/security";
import { featureEnabled } from "@/lib/features/flags";
import { recordUsage } from "@/lib/usage/check-limit";

const schema = z.object({ approvalToken: z.string().min(32), formHash: z.string().regex(/^[a-f0-9]{64}$/), review: formReviewSchema });
export function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: extensionCors(request) }); }

export async function POST(request: Request) {
  const extension = await authenticateExtension(request);
  if (!extension) return NextResponse.json({ error: "Session expired" }, { status: 401, headers: extensionCors(request) });
  if (!(await featureEnabled("AUTOMATED_SUBMISSION"))) return NextResponse.json({ error: "AUTOMATION_DISABLED", message: "Automated submission is currently disabled." }, { status: 503, headers: extensionCors(request) });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission request" }, { status: 400, headers: extensionCors(request) });
  const currentHash = stableHash(sanitizedSnapshot(parsed.data.review));
  if (currentHash !== parsed.data.formHash || validateReview(parsed.data.review).length) {
    await addApplicationEvent(extension.application_id, extension.user_id, "FORM_CHANGED_AFTER_APPROVAL", {}, currentHash);
    return NextResponse.json({ error: "FORM_CHANGED", message: "The application changed after your review. Please review it again." }, { status: 409, headers: extensionCors(request) });
  }
  const db = createAdminClient(); const now = new Date().toISOString();
  const [{ data: token }, { data: session }, { data: app }, { data: receipt }] = await Promise.all([
    db.from("submission_approval_tokens").select("id,expires_at,used_at,form_snapshot_hash").eq("token_hash", approvalTokenHash(parsed.data.approvalToken)).eq("user_id", extension.user_id).eq("application_id", extension.application_id).eq("session_id", parsed.data.review.sessionId).maybeSingle(),
    db.from("application_sessions").select("id,status,expires_at").eq("id", parsed.data.review.sessionId).eq("user_id", extension.user_id).eq("application_id", extension.application_id).maybeSingle(),
    db.from("applications").select("status").eq("id", extension.application_id).eq("user_id", extension.user_id).maybeSingle(),
    db.from("application_receipts").select("id").eq("application_id", extension.application_id).maybeSingle(),
  ]);
  if (!token || token.used_at || token.form_snapshot_hash !== currentHash || new Date(token.expires_at) <= new Date()) return NextResponse.json({ error: "APPROVAL_EXPIRED" }, { status: 409, headers: extensionCors(request) });
  if (!session || session.status !== "APPROVED_TO_SUBMIT" || new Date(session.expires_at) <= new Date()) return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 409, headers: extensionCors(request) });
  if (!app || app.status === "SUBMITTED" || receipt) return NextResponse.json({ error: "DUPLICATE_SUBMISSION" }, { status: 409, headers: extensionCors(request) });
  if (automationTestMode()) return NextResponse.json({ permitted: false, testMode: true, message: "Test mode: submission prevented." }, { status: 409, headers: extensionCors(request) });
  try { await recordUsage(extension.user_id, "AUTOMATED_SUBMISSION_ATTEMPT", { applicationId: extension.application_id }); } catch { return NextResponse.json({ error: "USAGE_LIMIT_REACHED" }, { status: 429, headers: extensionCors(request) }); }
  const { data: claimed } = await db.from("submission_approval_tokens").update({ used_at: now }).eq("id", token.id).is("used_at", null).select("id").maybeSingle();
  if (!claimed) return NextResponse.json({ error: "DUPLICATE_SUBMISSION" }, { status: 409, headers: extensionCors(request) });
  await db.from("application_sessions").update({ status: "SUBMITTING" }).eq("id", session.id).eq("status", "APPROVED_TO_SUBMIT");
  if (app.status === "READY_TO_APPLY") await transitionApplication(extension.application_id, extension.user_id, "APPLYING", { eventType: "SUBMISSION_STARTED", data: { sessionId: session.id } });
  else await addApplicationEvent(extension.application_id, extension.user_id, "SUBMISSION_STARTED", { sessionId: session.id }, session.id);
  return NextResponse.json({ permitted: true, singleUse: true, sessionId: session.id }, { headers: extensionCors(request) });
}
