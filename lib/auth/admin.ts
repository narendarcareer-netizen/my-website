import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function configuredAdmins() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean));
}

export async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !configuredAdmins().has(user.email.toLowerCase())) return null;
  return user;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/dashboard");
  return user;
}
