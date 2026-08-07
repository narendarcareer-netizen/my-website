import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset your password" description="Enter your account email and we’ll send you a secure reset link." footer={<Link className="font-semibold text-accent-600" href="/login">Return to sign in</Link>}><AuthForm mode="forgot" /></AuthShell>;
}
