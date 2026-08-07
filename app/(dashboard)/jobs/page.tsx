import { BriefcaseBusiness } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DatabaseJobCard } from "@/components/jobs/database-job-card";
import { JobFilters } from "@/components/jobs/job-filters";
import { Pagination } from "@/components/jobs/pagination";
import { createClient } from "@/lib/supabase/server";
import type { DatabaseJob } from "@/types/database-job";

const PAGE_SIZE = 12;

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const value = (key: string) => typeof raw[key] === "string" ? raw[key].slice(0, 100) : "";
  const values = { q: value("q"), location: value("location"), type: value("type"), company: value("company"), status: value("status") || "active", minMatch: value("minMatch"), sort: value("sort") || "match" };
  const page = Math.max(1, Math.min(1000, Number.parseInt(value("page") || "1", 10) || 1));
  const supabase = await createClient();
  const [{ data: companies }, jobsResult] = await Promise.all([
    supabase.from("companies").select("id, name").eq("active", true).order("name"),
    supabase.from("jobs").select("id, external_id, source_url, apply_url, title, description, location, workplace_type, employment_type, salary_min, salary_max, salary_currency, posted_at, updated_at, status, companies!inner(id, name, slug, website_url, careers_url, ats_type, ats_identifier, active), job_skills(skill), job_matches(overall_score,reasons)").eq("status", values.status === "closed" ? "closed" : "active"),
  ]);
  let jobs = (jobsResult.data ?? []) as unknown as DatabaseJob[];
  const search = values.q.toLowerCase().trim();
  if (search) jobs = jobs.filter(job => job.title.toLowerCase().includes(search) || job.companies.name.toLowerCase().includes(search));
  if (values.location) jobs = jobs.filter(job => job.location?.toLowerCase().includes(values.location.toLowerCase()));
  if (values.type) jobs = jobs.filter(job => job.employment_type === values.type);
  if (values.company) jobs = jobs.filter(job => job.companies.id === values.company);
  const minimum = Number.parseInt(values.minMatch, 10);
  if (Number.isFinite(minimum)) jobs = jobs.filter(job => (job.job_matches?.[0]?.overall_score ?? -1) >= minimum);
  jobs.sort((a, b) => values.sort === "newest" ? new Date(b.posted_at ?? b.updated_at).getTime() - new Date(a.posted_at ?? a.updated_at).getTime() : values.sort === "salary" ? (b.salary_max ?? b.salary_min ?? -1) - (a.salary_max ?? a.salary_min ?? -1) : (b.job_matches?.[0]?.overall_score ?? -1) - (a.job_matches?.[0]?.overall_score ?? -1));
  const total = jobs.length; const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); const safePage = Math.min(page, totalPages); const pageJobs = jobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const params = new URLSearchParams(Object.entries(values).filter(([, entry]) => entry));

  return <><DashboardHeader title="Find jobs" subtitle="Explore real opportunities ranked for your profile." /><main className="p-5 sm:p-8"><JobFilters companies={companies ?? []} values={values} /><div className="mb-5"><h2 className="text-lg font-semibold">Available roles</h2><p className="text-sm text-zinc-500">{total} {total === 1 ? "job" : "jobs"} found</p></div>{jobsResult.error ? <div className="card p-10 text-center text-sm text-rose-600">Jobs could not be loaded. Check the Phase 4 migration and try again.</div> : pageJobs.length ? <><div className="grid gap-4 xl:grid-cols-2">{pageJobs.map(job => <DatabaseJobCard key={job.id} job={job} />)}</div><Pagination page={safePage} totalPages={totalPages} params={params} /></> : <div className="card py-16 text-center"><BriefcaseBusiness className="mx-auto size-8 text-zinc-300" /><h3 className="mt-4 font-semibold">No jobs match these filters</h3><p className="mt-2 text-sm text-zinc-500">Try broadening your filters or recalculate matches from your profile.</p></div>}</main></>;
}
