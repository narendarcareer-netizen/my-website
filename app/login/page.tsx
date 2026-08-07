import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="Welcome back" description="Sign in to continue managing your job search." footer={<>New to JobPilot? <Link className="font-semibold text-accent-600" href="/signup">Create an account</Link></>}>
    {params.error === "confirmation" && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">That confirmation link is invalid or expired. Please try signing in again.</p>}
    <AuthForm mode="login" next={params.next} />
  </AuthShell>;
}
