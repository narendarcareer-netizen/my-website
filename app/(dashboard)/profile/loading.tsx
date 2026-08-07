import { DashboardHeader } from "@/components/dashboard-header";

export default function ProfileLoading() {
  return <><DashboardHeader title="Profile" subtitle="Loading your information…" /><main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">{[1, 2, 3].map(item => <div key={item} className="card animate-pulse p-8"><div className="h-5 w-44 rounded bg-zinc-200" /><div className="mt-7 grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map(field => <div key={field} className="h-12 rounded-xl bg-zinc-100" />)}</div></div>)}</main></>;
}
