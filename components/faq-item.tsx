"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-zinc-200"><button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-6 py-6 text-left font-semibold" aria-expanded={open}>{question}<ChevronDown className={`size-5 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} /></button>{open && <p className="max-w-2xl pb-6 text-sm leading-7 text-zinc-600">{answer}</p>}</div>;
}
