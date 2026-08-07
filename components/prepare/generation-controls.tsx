"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generateApplicationDrafts, regenerateApplicationDrafts } from "@/lib/actions/ai-documents";

export function GenerationControls({ jobId, resumes, hasDrafts }: { jobId: string; resumes: { id: string; file_name: string }[]; hasDrafts: boolean }) {
  const actionFn = hasDrafts ? regenerateApplicationDrafts : generateApplicationDrafts;
  const [state, action, pending] = useActionState(actionFn, {});
  if (!resumes.length) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Upload a PDF or DOCX résumé on your profile before preparing this application.</div>;
  return <form action={action} className="card p-5"><input type="hidden" name="jobId" value={jobId} /><div className="flex flex-col gap-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-sm font-medium">Résumé<select name="resumeId" className="mt-2 w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm">{resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.file_name}</option>)}</select></label><button disabled={pending} className="button-primary"><Sparkles className="size-4" />{pending ? "Preparing…" : hasDrafts ? "Regenerate drafts" : "Analyze and prepare"}</button></div>{pending && <div className="mt-5 grid gap-2 text-sm text-accent-700 sm:grid-cols-3"><p className="animate-pulse rounded-lg bg-accent-50 p-3">Analyzing your résumé…</p><p className="animate-pulse rounded-lg bg-accent-50 p-3 [animation-delay:250ms]">Comparing with job…</p><p className="animate-pulse rounded-lg bg-accent-50 p-3 [animation-delay:500ms]">Preparing suggestions…</p></div>}{state.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}{state.success && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</p>}</form>;
}
