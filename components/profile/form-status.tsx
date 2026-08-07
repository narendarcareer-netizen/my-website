export function FormStatus({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p role={error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{error ?? success}</p>;
}
