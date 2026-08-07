import Link from "next/link";
import { Navigation } from "lucide-react";

export function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`inline-flex items-center gap-2 text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}><span className="grid size-9 place-items-center rounded-xl bg-accent-600 text-white shadow-sm"><Navigation className="size-4 rotate-45" /></span>JobPilot</Link>;
}
