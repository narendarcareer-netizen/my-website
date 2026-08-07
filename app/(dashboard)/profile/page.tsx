import { FileText, ShieldCheck, Trash2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { AuthorizationForm } from "@/components/profile/authorization-form";
import { PreferencesForm } from "@/components/profile/preferences-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { ResumeUpload } from "@/components/profile/resume-upload";
import { SkillsSection } from "@/components/profile/skills-section";
import { deleteResume, deleteWorkAuthorization } from "@/lib/actions/profile";
import { removeSkill } from "@/lib/actions/skills";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [profileResult, preferencesResult, authorizationsResult, resumesResult, skillsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, location, linkedin_url, portfolio_url, years_experience").maybeSingle(),
    supabase.from("job_preferences").select("preferred_titles, preferred_locations, remote_preference, employment_types, minimum_salary, salary_currency, industries").maybeSingle(),
    supabase.from("work_authorizations").select("id, country, authorization_type, requires_sponsorship").order("created_at", { ascending: false }),
    supabase.from("resumes").select("id, file_name, is_primary, created_at").order("created_at", { ascending: false }),
    supabase.from("user_skills").select("id, skill, source").order("skill"),
  ]);

  return <><DashboardHeader title="Profile" subtitle="Keep your experience, preferences, and documents current." /><main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8"><ProfileForm profile={profileResult.data} email={user?.email ?? ""} /><PreferencesForm preferences={preferencesResult.data} /><SkillsSection skills={skillsResult.data ?? []} removeAction={removeSkill} /><section className="card p-6 sm:p-8"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent-50 text-accent-600"><ShieldCheck className="size-5" /></span><div><h2 className="text-lg font-semibold">Work authorization</h2><p className="mt-1 text-sm text-zinc-500">Add each country where you can legally work.</p></div></div><AuthorizationForm /><div className="mt-6 divide-y">{authorizationsResult.data?.length ? authorizationsResult.data.map(item => <div key={item.id} className="flex items-center gap-4 py-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.country}</p><p className="text-xs text-zinc-500">{item.authorization_type} · {item.requires_sponsorship ? "Sponsorship required" : "No sponsorship required"}</p></div><form action={deleteWorkAuthorization}><input type="hidden" name="id" value={item.id} /><button className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${item.country} authorization`}><Trash2 className="size-4" /></button></form></div>) : <p className="py-6 text-sm text-zinc-500">No work authorizations added yet.</p>}</div></section><section className="card p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><h2 className="text-lg font-semibold">Résumés</h2><p className="mt-1 text-sm text-zinc-500">Upload documents for your application workspace.</p></div><ResumeUpload /></div><div className="mt-6 divide-y">{resumesResult.data?.length ? resumesResult.data.map(resume => <div key={resume.id} className="flex items-center gap-3 py-4"><span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-500"><FileText className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{resume.file_name}</p><p className="text-xs text-zinc-500">Uploaded {new Date(resume.created_at).toLocaleDateString()}</p></div>{resume.is_primary && <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">Primary</span>}<form action={deleteResume}><input type="hidden" name="id" value={resume.id} /><button className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${resume.file_name}`}><Trash2 className="size-4" /></button></form></div>) : <div className="py-10 text-center"><FileText className="mx-auto size-7 text-zinc-300" /><p className="mt-3 text-sm font-medium">No résumés uploaded</p><p className="mt-1 text-xs text-zinc-500">Your private documents will appear here.</p></div>}</div></section></main></>;
}
