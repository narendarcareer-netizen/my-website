"use client";

import { Bell, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "./sidebar";

export function DashboardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  return <><header className="flex h-20 items-center gap-4 border-b border-zinc-200 bg-white px-5 sm:px-8"><button onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-600 lg:hidden" aria-label="Open menu"><Menu /></button><div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="hidden text-xs text-zinc-500 sm:block">{subtitle}</p>}</div><div className="ml-auto hidden w-full max-w-sm items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 md:flex"><Search className="size-4 text-zinc-400" /><input className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" placeholder="Search jobs, companies, skills..." /></div><button className="relative rounded-xl border border-zinc-200 p-2.5 text-zinc-500" aria-label="Notifications"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-accent-600" /></button></header>{open && <div className="fixed inset-0 z-50 flex lg:hidden"><button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="Close menu overlay" /><div className="relative h-full"><Sidebar mobile onNavigate={() => setOpen(false)} /></div><button onClick={() => setOpen(false)} className="relative m-4 grid size-10 place-items-center rounded-full bg-white shadow" aria-label="Close menu"><X className="size-5" /></button></div>}</>;
}
