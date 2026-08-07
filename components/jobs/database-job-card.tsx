import Link from "next/link";
import { BriefcaseBusiness, Clock3, MapPin } from "lucide-react";
import type { DatabaseJob } from "@/types/database-job";

function salary(job: DatabaseJob) {
  if (job.salary_min == null && job.salary_max == null) return null;
  const format = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: job.salary_currency ?? "USD", maximumFractionDigits: 0 }).format(value);
  return job.salary_min != null && job.salary_max != null ? `${format(job.salary_min)}–${format(job.salary_max)}` : format(job.salary_min ?? job.salary_max!);
}

export function DatabaseJobCard({ job }: { job: DatabaseJob }) {
  const salaryText = salary(job); const date = job.posted_at ?? job.updated_at; const match = job.job_matches?.[0];
  const initials = job.companies.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return <article className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent-100 hover:shadow-soft"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-600 text-xs font-bold text-white">{initials}</div><div className="min-w-0 flex-1"><p className="text-xs font-medium text-zinc-500">{job.companies.name}</p><h2 className="mt-0.5 font-semibold tracking-tight text-zinc-900">{job.title}</h2></div>{match ? <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700">{match.overall_score}% match</span> : <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">Not scored</span>}</div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500"><span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{job.location ?? "Location not listed"}</span><span className="flex items-center gap-1.5"><BriefcaseBusiness className="size-3.5" />{job.employment_type ?? "Not specified"}</span><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date))}</span></div>{salaryText && <p className="mt-4 text-sm font-semibold text-zinc-800">{salaryText}</p>}{job.job_skills?.length ? <div className="mt-4 flex flex-wrap gap-2">{job.job_skills.slice(0, 4).map(({ skill }) => <span key={skill} className="rounded-lg bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600">{skill}</span>)}</div> : null}<div className="mt-5 border-t pt-4"><Link href={`/jobs/${job.id}`} className="inline-flex items-center text-sm font-semibold text-accent-600 hover:text-accent-700">View details →</Link></div></article>;
}
