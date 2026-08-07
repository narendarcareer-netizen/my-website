"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { runJobImport } from "@/lib/actions/job-sources";

export function ImportButton({ companyId, boardIdentifier }: { companyId: string; boardIdentifier: string }) {
  const [state, action, pending] = useActionState(runJobImport, {});
  return <div><form action={action}><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="boardIdentifier" value={boardIdentifier} /><button disabled={pending} className="button-secondary !px-4 !py-2"><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />{pending ? "Importing…" : "Import Jobs"}</button></form>{state.error && <p className="mt-3 text-xs text-rose-600">{state.error}</p>}{state.result && <div className="mt-3 flex flex-wrap gap-2 text-xs">{Object.entries(state.result).filter(([key]) => key !== "errors").map(([key, value]) => <span key={key} className="rounded-lg bg-zinc-100 px-2 py-1"><strong>{value}</strong> {key}</span>)}{state.result.errors.map(error => <p key={error} className="w-full text-rose-600">{error}</p>)}</div>}</div>;
}
