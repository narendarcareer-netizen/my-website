"use client";

import { useActionState } from "react";
import { addWorkAuthorization } from "@/lib/actions/profile";
import { FormStatus } from "./form-status";

export function AuthorizationForm() {
  const [state, action, pending] = useActionState(addWorkAuthorization, {});
  const field = "mt-2 w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100";
  return <form action={action} className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Country<input className={field} name="country" placeholder="United States" required /></label><label className="text-sm font-medium">Authorization type<input className={field} name="authorization_type" placeholder="Citizen, work permit…" required /></label><label className="text-sm font-medium">Need sponsorship?<select className={field} name="requires_sponsorship"><option value="false">No</option><option value="true">Yes</option></select></label><div className="sm:col-span-3"><FormStatus {...state} /><button disabled={pending} className="button-secondary mt-4">{pending ? "Adding…" : "Add authorization"}</button></div></form>;
}
