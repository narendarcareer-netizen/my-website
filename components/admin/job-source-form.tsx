"use client";

import { useActionState } from "react";
import { saveJobSource } from "@/lib/actions/job-sources";

export function JobSourceForm() {
  const [state, action, pending] = useActionState(saveJobSource, {});
  const field = "mt-2 w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100";
  return <form action={action} className="card p-6"><h2 className="font-semibold">Add Greenhouse source</h2><p className="mt-1 text-sm text-zinc-500">Use the public board token, not an API key.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Company name<input name="companyName" className={field} placeholder="Figma" required /></label><label className="text-sm font-medium">Board identifier<input name="boardIdentifier" className={field} placeholder="figma" required /></label><label className="text-sm font-medium">Careers URL<input name="careersUrl" type="url" className={field} placeholder="https://www.figma.com/careers" required /></label><label className="text-sm font-medium">Company website <span className="text-zinc-400">(optional)</span><input name="websiteUrl" type="url" className={field} placeholder="https://www.figma.com" /></label></div>{(state.error || state.success) && <p className={`mt-5 rounded-xl p-3 text-sm ${state.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{state.error ?? state.success}</p>}<button disabled={pending} className="button-primary mt-5">{pending ? "Saving…" : "Save source"}</button></form>;
}
