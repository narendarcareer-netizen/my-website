"use client";

export default function JobsError({ reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-[70vh] place-items-center p-6"><div className="card max-w-md p-8 text-center"><h2 className="font-semibold">Jobs are temporarily unavailable</h2><p className="mt-2 text-sm text-zinc-500">Check your connection and database migration, then try again.</p><button onClick={reset} className="button-primary mt-5">Try again</button></div></main>;
}
