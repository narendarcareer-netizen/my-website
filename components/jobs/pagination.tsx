import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: URLSearchParams }) {
  if (totalPages <= 1) return null;
  const href = (target: number) => { const next = new URLSearchParams(params); next.set("page", String(target)); return `/jobs?${next}`; };
  return <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Job results pages"><Link aria-disabled={page === 1} className={`button-secondary !p-2.5 ${page === 1 ? "pointer-events-none opacity-40" : ""}`} href={href(page - 1)}><ChevronLeft className="size-4" /><span className="sr-only">Previous page</span></Link><span className="text-sm text-zinc-500">Page <strong className="text-zinc-800">{page}</strong> of {totalPages}</span><Link aria-disabled={page === totalPages} className={`button-secondary !p-2.5 ${page === totalPages ? "pointer-events-none opacity-40" : ""}`} href={href(page + 1)}><ChevronRight className="size-4" /><span className="sr-only">Next page</span></Link></nav>;
}
