"use client";

export default function ProfileError({ reset }: { error: Error; reset: () => void }) {
  return <main className="grid min-h-[70vh] place-items-center p-6"><div className="card max-w-md p-8 text-center"><h2 className="text-lg font-semibold">We couldn’t load your profile</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Check your connection and Supabase setup, then try again.</p><button onClick={reset} className="button-primary mt-6">Try again</button></div></main>;
}
