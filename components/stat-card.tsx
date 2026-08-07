import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, change, icon: Icon, tone = "indigo" }: { label: string; value: string; change: string; icon: LucideIcon; tone?: "indigo" | "green" | "amber" | "rose" }) {
  const tones = { indigo: "bg-accent-50 text-accent-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600" };
  return <div className="card p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-500">{label}</span><span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-4" /></span></div><div className="mt-5 flex items-end justify-between"><strong className="text-3xl font-semibold tracking-tight">{value}</strong><span className="text-xs font-medium text-zinc-500">{change}</span></div></div>;
}
