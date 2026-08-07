import type { ApplicationStatus } from "@/types/job";

const styles: Record<ApplicationStatus, string> = { Saved: "bg-zinc-100 text-zinc-600", Preparing: "bg-amber-50 text-amber-700", Applied: "bg-blue-50 text-blue-700", Interview: "bg-purple-50 text-purple-700", Offer: "bg-emerald-50 text-emerald-700", Closed: "bg-rose-50 text-rose-700" };

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}
