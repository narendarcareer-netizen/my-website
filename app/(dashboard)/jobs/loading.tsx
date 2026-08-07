import { DashboardHeader } from "@/components/dashboard-header";

export default function JobsLoading() {
  return <><DashboardHeader title="Find jobs" subtitle="Loading real opportunities…" /><main className="p-5 sm:p-8"><div className="card h-20 animate-pulse bg-zinc-100" /><div className="mt-6 grid gap-4 xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="card h-56 animate-pulse bg-zinc-100" />)}</div></main></>;
}
