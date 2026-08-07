import { Sidebar } from "@/components/sidebar";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="flex h-screen overflow-hidden bg-canvas"><Sidebar /><div className="min-w-0 flex-1 overflow-y-auto">{children}</div></div>;
}
