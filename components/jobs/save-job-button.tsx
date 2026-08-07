"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Bookmark, ListPlus } from "lucide-react";
import { addToApplicationQueue } from "@/lib/actions/applications";
import { toggleSavedJob } from "@/lib/actions/saved-jobs";

export function SaveJobButton({ jobId, initialSaved }: { jobId: string; initialSaved: boolean }) {
  const [state, action, pending] = useActionState(toggleSavedJob.bind(null, jobId, initialSaved), { saved: initialSaved });
  const saved = state.saved ?? initialSaved;
  return <div className="flex flex-wrap items-center gap-2">
    <form action={action}><button disabled={pending} className="button-secondary !py-2"><Bookmark className={`size-4 ${saved ? "fill-current text-accent-600" : ""}`} />{pending ? "Saving..." : saved ? "Saved" : "Save job"}</button></form>
    <Link href={`/jobs/${jobId}/prepare`} className="button-primary !py-2">Prepare application</Link>
    <form action={addToApplicationQueue}><input type="hidden" name="jobId" value={jobId}/><button className="button-secondary !py-2"><ListPlus className="size-4"/>Add to queue</button></form>
    {state.error && <p className="w-full text-xs text-rose-600">{state.error}</p>}
  </div>;
}
