"use client";

import { useActionState } from "react";
import { saveTextDraft } from "@/lib/actions/ai-documents";

export function TextDraftEditor({ draftId, jobId, text, label }: { draftId: string; jobId: string; text: string; label: string }) {
  const [state, action, pending] = useActionState(saveTextDraft, {});
  return <form action={action}><input type="hidden" name="draftId" value={draftId} /><input type="hidden" name="jobId" value={jobId} /><label className="sr-only" htmlFor={`draft-${draftId}`}>{label}</label><textarea id={`draft-${draftId}`} name="content" defaultValue={text} rows={16} className="w-full resize-y rounded-xl border bg-zinc-50 p-4 text-sm leading-7 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100" maxLength={30000} /><div className="mt-3 flex items-center gap-3"><button disabled={pending} className="button-secondary !py-2">{pending ? "Saving…" : "Save draft"}</button>{state.error && <p className="text-xs text-rose-600">{state.error}</p>}{state.success && <p className="text-xs text-emerald-600">{state.success}</p>}</div></form>;
}
