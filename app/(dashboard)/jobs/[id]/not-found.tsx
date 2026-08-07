import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";

export default function JobNotFound() {
  return <main className="grid min-h-[70vh] place-items-center p-6"><div className="text-center"><BriefcaseBusiness className="mx-auto size-9 text-zinc-300" /><h1 className="mt-4 text-xl font-semibold">This job is no longer available</h1><p className="mt-2 text-sm text-zinc-500">It may have been closed or removed from the employer’s board.</p><Link href="/jobs" className="button-primary mt-6">Browse active jobs</Link></div></main>;
}
