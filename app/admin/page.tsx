/* eslint-disable react-hooks/purity -- this dynamic server page computes live operational cutoffs */
import { setFeatureFlag } from "@/lib/actions/admin-production";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardHeader } from "@/components/dashboard-header";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireAdmin();
  const db = createAdminClient();
  const day = new Date(Date.now() - 86_400_000).toISOString();
  const heartbeatCutoff = new Date(Date.now() - 90_000).toISOString();
  const [
    { count: users },
    { count: subscriptions },
    { count: ai },
    { count: submitted },
    { count: backlog },
    { data: workers },
    { data: sources },
    { data: alerts },
    { data: flags },
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", day),
    db.from("applications").select("id", { count: "exact", head: true }).eq("status", "SUBMITTED"),
    db.from("source_onboarding_items").select("id", { count: "exact", head: true }).in("status", ["PENDING", "DETECTING"]),
    db.from("worker_instances").select("hostname,version,last_heartbeat_at").order("last_heartbeat_at", { ascending: false }),
    db.from("career_sources").select("health_status"),
    db.from("ingestion_alerts").select("id,title,severity").is("resolved_at", null).limit(20),
    db.from("feature_flags").select("key,enabled,description").order("key"),
  ]);
  const healthyWorkers = workers?.filter((worker) => worker.last_heartbeat_at >= heartbeatCutoff).length ?? 0;
  const cards = [
    ["Users", users ?? 0],
    ["Active subscriptions", subscriptions ?? 0],
    ["AI operations (24h)", ai ?? 0],
    ["Submitted applications", submitted ?? 0],
    ["Worker health", `${healthyWorkers}/${workers?.length ?? 0}`],
    ["Onboarding backlog", backlog ?? 0],
    ["Failing ATS sources", sources?.filter((source) => source.health_status === "FAILING").length ?? 0],
    ["Open alerts", alerts?.length ?? 0],
  ];

  return (
    <>
      <DashboardHeader title="Production overview" subtitle="Operational metadata only—private résumés and answers are not exposed." />
      <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <div className="card p-4" key={label}>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Feature flags and emergency controls</h2>
          <div className="mt-4 divide-y">
            {flags?.map((flag) => (
              <div className="flex items-center justify-between py-3" key={flag.key}>
                <div>
                  <strong className="text-sm">{flag.key}</strong>
                  <p className="text-xs text-zinc-500">{flag.description}</p>
                </div>
                <form action={setFeatureFlag}>
                  <input type="hidden" name="key" value={flag.key} />
                  <input type="hidden" name="enabled" value={String(!flag.enabled)} />
                  <button className={flag.enabled ? "text-emerald-700" : "text-zinc-500"}>
                    {flag.enabled ? "Enabled — disable" : "Disabled — enable"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
