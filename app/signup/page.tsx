import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return <AuthShell title="Create your workspace" description="Start organizing your search with a secure JobPilot account." footer={<>Already have an account? <Link className="font-semibold text-accent-600" href="/login">Sign in</Link></>}><AuthForm mode="signup" /></AuthShell>;
}
