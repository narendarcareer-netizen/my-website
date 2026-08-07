import Link from "next/link";
import { MapPin } from "lucide-react";
import { SaveJobButton } from "./save-job-button";

export function RecommendedJobCard({ job, score, reasons, saved }: { job: { id: string; title: string; location: string | null; company: string }; score: number; reasons: string[]; saved: boolean }) {
  return <article className="card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-zinc-500">{job.company}</p><h3 className="mt-1 font-semibold">{job.title}</h3></div><span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700">{score}% match</span></div><p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="size-3.5" />{job.location ?? "Location not listed"}</p><ul className="mt-4 space-y-2">{reasons.slice(0, 3).map(reason => <li key={reason} className="text-xs leading-5 text-zinc-600">✓ {reason}</li>)}</ul><div className="mt-5 flex items-center justify-between gap-3 border-t pt-4"><Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-accent-600">View job →</Link><SaveJobButton jobId={job.id} initialSaved={saved} /></div></article>;
}
