"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { FormStatus } from "./form-status";

type Profile = { full_name: string | null; phone: string | null; location: string | null; linkedin_url: string | null; portfolio_url: string | null; years_experience: number | null } | null;

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const field = "mt-2 w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100";
  return <form action={action} className="card p-6 sm:p-8"><div><h2 className="text-lg font-semibold">Personal profile</h2><p className="mt-1 text-sm text-zinc-500">The information employers usually need first.</p></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Full name<input className={field} name="full_name" defaultValue={profile?.full_name ?? ""} required maxLength={100} /></label><label className="text-sm font-medium">Account email<input className={field} value={email} disabled /></label><label className="text-sm font-medium">Phone<input className={field} name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={30} /></label><label className="text-sm font-medium">Location<input className={field} name="location" defaultValue={profile?.location ?? ""} maxLength={120} /></label><label className="text-sm font-medium">LinkedIn URL<input className={field} name="linkedin_url" type="url" placeholder="https://linkedin.com/in/…" defaultValue={profile?.linkedin_url ?? ""} /></label><label className="text-sm font-medium">Portfolio URL<input className={field} name="portfolio_url" type="url" placeholder="https://…" defaultValue={profile?.portfolio_url ?? ""} /></label><label className="text-sm font-medium">Years of experience<input className={field} name="years_experience" type="number" min="0" max="70" defaultValue={profile?.years_experience ?? 0} required /></label></div><div className="mt-6"><FormStatus {...state} /></div><button disabled={pending} className="button-primary mt-5 disabled:opacity-60">{pending ? "Saving…" : "Save profile"}</button></form>;
}
