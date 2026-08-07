import Link from "next/link";
import { AlertCircle, BriefcaseBusiness, CalendarCheck, Send, Target } from "lucide-react";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { DashboardHeader } from "@/components/dashboard-header";
import { RecommendedJobCard } from "@/components/jobs/recommended-job-card";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/applications/types";
import type { MatchReasons } from "@/lib/matching/types";

interface MatchRow { overall_score:number; reasons:MatchReasons; jobs:{id:string;title:string;location:string|null;companies:{name:string}} }
interface AppRow { id:string; job_id:string; status:ApplicationStatus; jobs:{title:string;companies:{name:string}} }
export default async function DashboardPage(){
 const db=await createClient(); const [{data:matchData},{data:appData}]=await Promise.all([
  db.from("job_matches").select("overall_score,reasons,jobs!inner(id,title,location,status,companies!inner(name))").eq("jobs.status","active").order("overall_score",{ascending:false}).limit(12),
  db.from("applications").select("id,job_id,status,jobs!inner(title,companies!inner(name))").order("last_activity_at",{ascending:false})]);
 const apps=(appData??[]) as unknown as AppRow[]; const applied=new Set(apps.map(a=>a.job_id));
 const matches=((matchData??[]) as unknown as MatchRow[]).filter(m=>!applied.has(m.jobs.id)).slice(0,4);
 const count=(...s:string[])=>apps.filter(a=>s.includes(a.status)).length; const attention=apps.filter(a=>["SAVED","PREPARING","NEEDS_REVIEW","NEEDS_USER_ACTION","FAILED"].includes(a.status)).slice(0,5);
 return <><DashboardHeader title="Good morning" subtitle="Your application pipeline and personalized opportunities."/><main className="p-5 sm:p-8"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Saved & preparing" value={String(count("SAVED","PREPARING","NEEDS_REVIEW"))} change="Needs attention" icon={BriefcaseBusiness}/><StatCard label="Ready" value={String(count("READY_TO_APPLY"))} change="User initiated only" icon={Send} tone="green"/><StatCard label="Interviews" value={String(count("INTERVIEW"))} change={`${count("SUBMITTED")} submitted`} icon={CalendarCheck} tone="amber"/><StatCard label="Offers" value={String(count("OFFER"))} change={`${count("REJECTED")} rejections`} icon={Target} tone="rose"/></div><div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_.65fr]"><section><h2 className="text-lg font-semibold">Recommended unapplied jobs</h2><p className="mb-4 text-sm text-zinc-500">Highest active matches</p><div className="grid gap-4 md:grid-cols-2">{matches.map(m=><RecommendedJobCard key={m.jobs.id} job={{id:m.jobs.id,title:m.jobs.title,location:m.jobs.location,company:m.jobs.companies.name}} score={m.overall_score} reasons={m.reasons.strong} saved={false}/>)}</div></section><section><h2 className="text-lg font-semibold">Needs attention</h2><p className="mb-4 text-sm text-zinc-500">Recent application activity</p><div className="card divide-y">{attention.length?attention.map(a=><Link href={`/applications/${a.id}`} key={a.id} className="flex items-center gap-3 p-4 hover:bg-zinc-50"><AlertCircle className="size-4 text-amber-600"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.jobs.title}</p><p className="text-xs text-zinc-500">{a.jobs.companies.name}</p></div><ApplicationStatusBadge status={a.status}/></Link>):<p className="p-6 text-sm text-zinc-500">Nothing needs attention.</p>}</div></section></div></main></>;
}
