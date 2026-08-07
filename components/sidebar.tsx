"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Send, Columns3, UserRound, Settings, HelpCircle, LogOut, Bell } from "lucide-react";
import { Logo } from "./logo";

const links = [{ label: "Overview", href: "/dashboard", icon: LayoutDashboard }, { label: "Find jobs", href: "/jobs", icon: Search }, { label: "Applications", href: "/applications", icon: Send }, { label: "Tracker", href: "/tracker", icon: Columns3 }, { label: "Notifications", href: "/notifications", icon: Bell }, { label: "Profile", href: "/profile", icon: UserRound }, { label: "Settings", href: "/settings", icon: Settings }];

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <aside className={`${mobile ? "flex" : "hidden lg:flex"} h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-5`}><Logo /><nav className="mt-9 flex-1 space-y-1">{links.map(({ label, href, icon: Icon }) => { const active = pathname === href; return <Link onClick={onNavigate} key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-accent-50 text-accent-700" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}><Icon className="size-4" />{label}</Link>; })}</nav><div className="rounded-2xl bg-zinc-50 p-4"><HelpCircle className="size-5 text-accent-600" /><p className="mt-3 text-sm font-semibold">Need a hand?</p><p className="mt-1 text-xs leading-5 text-zinc-500">Visit the beginner guide to get the most from JobPilot.</p></div><div className="mt-4 flex items-center gap-3 border-t pt-4"><div className="grid size-9 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">JP</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Your workspace</p><p className="text-xs text-zinc-500">Job seeker</p></div><form action="/auth/logout" method="post"><button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-50 hover:text-rose-600" aria-label="Sign out"><LogOut className="size-4" /></button></form></div></aside>;
}
