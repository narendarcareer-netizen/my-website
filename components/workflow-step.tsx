import type { LucideIcon } from "lucide-react";

export function WorkflowStep({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: LucideIcon }) {
  return <div className="group relative rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-soft"><div className="mb-12 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-accent-50 text-accent-600 transition group-hover:bg-accent-600 group-hover:text-white"><Icon className="size-5" /></span><span className="font-mono text-xs text-zinc-400">{number}</span></div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p></div>;
}
