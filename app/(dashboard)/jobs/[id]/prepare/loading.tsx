export default function PreparationLoading() {
  return <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8"><div className="h-6 w-32 animate-pulse rounded bg-zinc-200" /><div className="card h-28 animate-pulse bg-zinc-100" />{[1,2,3,4].map(item => <div key={item} className="card h-56 animate-pulse bg-zinc-100" />)}</main>;
}
