"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";

const links = [{ label: "How it works", href: "#workflow" }, { label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "FAQ", href: "#faq" }];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-canvas/85 backdrop-blur-xl"><nav className="container-shell flex h-20 items-center justify-between" aria-label="Main navigation"><Logo /><div className="hidden items-center gap-8 md:flex">{links.map(link => <Link key={link.label} href={link.href} className="text-sm font-medium text-zinc-600 transition hover:text-ink">{link.label}</Link>)}</div><div className="hidden items-center gap-3 md:flex"><Link href="/dashboard" className="px-3 py-2 text-sm font-semibold text-zinc-700">Sign in</Link><Link href="/dashboard" className="button-primary !px-4 !py-2.5">Start for free</Link></div><button onClick={() => setOpen(!open)} className="rounded-lg p-2 md:hidden" aria-expanded={open} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button></nav>{open && <div className="border-t bg-white px-5 py-5 md:hidden">{links.map(link => <Link onClick={() => setOpen(false)} key={link.label} href={link.href} className="block py-3 font-medium text-zinc-700">{link.label}</Link>)}<Link href="/dashboard" className="button-primary mt-4 w-full">Open dashboard</Link></div>}</header>;
}
