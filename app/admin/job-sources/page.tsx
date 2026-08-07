import { Database, ExternalLink } from "lucide-react";
import { ImportButton } from "@/components/admin/import-button";
import { JobSourceForm } from "@/components/admin/job-source-form";
import { DashboardHeader } from "@/components/dashboard-header";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function JobSourcesPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: companies, error } = await supabase.from("companies").select("id, name, ats_identifier, careers_url, active, jobs(count)").eq("ats_type", "greenhouse").order("name");
  return <><DashboardHeader title="Job sources" subtitle="Manage approved public Greenhouse imports." /><main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8"><div className="rounded-2xl border border-accent-100 bg-accent-50 p-4 text-sm text-accent-700"><strong>Tested example:</strong> Company “Figma”, board identifier “figma”, careers URL “https://www.figma.com/careers/”.</div><JobSourceForm /><section className="card overflow-hidden"><div className="border-b p-6"><h2 className="font-semibold">Configured sources</h2><p className="mt-1 text-sm text-zinc-500">Imports use Greenhouse’s public Job Board API.</p></div>{error ? <p className="p-6 text-sm text-rose-600">Sources could not be loaded. Confirm the migration and service-role environment variable.</p> : companies?.length ? <div className="divide-y">{companies.map(company => <div key={company.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent-50 text-accent-600"><Database className="size-4" /></span><div><div className="flex items-center gap-2"><p className="font-semibold">{company.name}</p>{company.careers_url && <a href={company.careers_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-accent-600" aria-label={`${company.name} careers`}><ExternalLink className="size-3.5" /></a>}</div><p className="text-xs text-zinc-500">Board: {company.ats_identifier} · {company.jobs?.[0]?.count ?? 0} jobs</p></div></div><ImportButton companyId={company.id} boardIdentifier={company.ats_identifier} /></div>)}</div> : <div className="p-10 text-center"><Database className="mx-auto size-7 text-zinc-300" /><p className="mt-3 text-sm font-medium">No sources configured</p><p className="mt-1 text-xs text-zinc-500">Add the tested example above to run your first import.</p></div>}</section></main></>;
}
