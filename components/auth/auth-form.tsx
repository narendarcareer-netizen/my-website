"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, login, resetPassword, signup, type AuthState } from "@/lib/actions/auth";

type Mode = "login" | "signup" | "forgot" | "reset";
const actions = { login, signup, forgot: forgotPassword, reset: resetPassword };

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(actions[mode], {});
  const inputClass = "mt-2 w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100";

  return <form action={action} className="mt-8 space-y-5">
    {next && <input type="hidden" name="next" value={next} />}
    {mode === "signup" && <label className="block text-sm font-medium">Full name<input className={inputClass} name="fullName" autoComplete="name" required maxLength={100} /></label>}
    {(mode === "login" || mode === "signup" || mode === "forgot") && <label className="block text-sm font-medium">Email address<input className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
    {(mode === "login" || mode === "signup" || mode === "reset") && <label className="block text-sm font-medium">{mode === "reset" ? "New password" : "Password"}<input className={inputClass} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 8} maxLength={72} />{mode === "signup" && <span className="mt-2 block text-xs text-zinc-400">Use at least 8 characters.</span>}</label>}
    {mode === "reset" && <label className="block text-sm font-medium">Confirm new password<input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></label>}
    {mode === "login" && <div className="text-right"><Link href="/forgot-password" className="text-xs font-semibold text-accent-600 hover:text-accent-700">Forgot password?</Link></div>}
    {state.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
    {state.success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</p>}
    <button disabled={pending} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Set new password"}</button>
  </form>;
}
