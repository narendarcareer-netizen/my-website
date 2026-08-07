"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@/lib/validation/auth";
import { createHash } from "node:crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { appUrl } from "@/lib/config/app-url";

export type AuthState = { error?: string; success?: string };
const authKey=(email:string)=>createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

function messageFrom(error: { message: string } | null) {
  if (!error) return undefined;
  if (error.message.toLowerCase().includes("invalid login")) return "The email or password is incorrect.";
  if (error.message.toLowerCase().includes("already registered")) return "An account already exists for this email.";
  return "We could not complete that request. Please try again.";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await rateLimit("login",authKey(parsed.data.email),10,900)).success) return { error: "Too many attempts. Try again later." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: messageFrom(error) };
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({ fullName: formData.get("fullName"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await rateLimit("signup",authKey(parsed.data.email),3,3600)).success) return { error: "Too many signup attempts. Try again later." };
  const supabase = await createClient();
  const siteUrl = appUrl();
  const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${siteUrl}/auth/callback` } });
  if (error) return { error: messageFrom(error) };
  if (data.session) redirect("/dashboard");
  return { success: "Check your email to confirm your account, then sign in." };
}

export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!(await rateLimit("password-reset",authKey(parsed.data.email),3,3600)).success) return { success: "If that email has an account, a reset link is on its way." };
  const supabase = await createClient();
  const siteUrl = appUrl();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` });
  return { success: "If that email has an account, a reset link is on its way." };
}

export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "The reset link may have expired. Request a new one and try again." };
  redirect("/dashboard");
}
