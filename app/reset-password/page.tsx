import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  return <AuthShell title="Choose a new password" description="Use a unique password with at least eight characters." footer={<>After saving, you’ll continue to your dashboard.</>}><AuthForm mode="reset" /></AuthShell>;
}
