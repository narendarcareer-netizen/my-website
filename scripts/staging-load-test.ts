type StageResult = {
  users: number;
  requests: number;
  durationMs: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  statusCounts: Record<string, number>;
  databaseErrors: number;
  vercelErrors: number;
  rateLimits: number;
  stopped: boolean;
};

export {};

const baseUrl = new URL(process.env.LOAD_TEST_URL ?? "");
if (baseUrl.protocol !== "https:") throw new Error("LOAD_TEST_URL must be an HTTPS staging URL.");

const stages = [10, 25, 50, 100];
const paths = ["/", "/login", "/signup", "/api/health", "/jobs?page=1", "/jobs?page=2"];
const requestsPerUser = 6;
const percentile = (values: number[], fraction: number) =>
  values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)] ?? 0;

async function request(path: string) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "JobPilot-Staging-Load-Test/1.0" },
    });
    let databaseError = false;
    if (path === "/api/health") {
      const body = await response.clone().json().catch(() => null) as { database?: string } | null;
      databaseError = response.status !== 200 || body?.database === "error";
    }
    return { latency: performance.now() - started, status: response.status, databaseError };
  } catch {
    return { latency: performance.now() - started, status: 0, databaseError: path === "/api/health" };
  }
}

async function runStage(users: number): Promise<StageResult> {
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: users }, async (_, user) => {
    const rows = [];
    for (let index = 0; index < requestsPerUser; index += 1) {
      rows.push(await request(paths[(user + index) % paths.length]));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return rows;
  }));
  const flat = results.flat();
  const durationMs = performance.now() - started;
  const latencies = flat.map((row) => row.latency).sort((a, b) => a - b);
  const statusCounts: Record<string, number> = {};
  for (const row of flat) statusCounts[String(row.status)] = (statusCounts[String(row.status)] ?? 0) + 1;
  const rateLimits = flat.filter((row) => row.status === 429).length;
  const vercelErrors = flat.filter((row) => row.status >= 500 || row.status === 0).length;
  const databaseErrors = flat.filter((row) => row.databaseError).length;
  const errors = flat.filter((row) => row.status === 0 || row.status === 429 || row.status >= 400).length;
  const errorRate = errors / flat.length;
  return {
    users,
    requests: flat.length,
    durationMs: Math.round(durationMs),
    rps: Number((flat.length / (durationMs / 1000)).toFixed(2)),
    p50: Math.round(percentile(latencies, 0.5)),
    p95: Math.round(percentile(latencies, 0.95)),
    p99: Math.round(percentile(latencies, 0.99)),
    errorRate: Number((errorRate * 100).toFixed(2)),
    statusCounts,
    databaseErrors,
    vercelErrors,
    rateLimits,
    stopped: errorRate > 0.05 || databaseErrors > 0 || vercelErrors > Math.max(2, flat.length * 0.02),
  };
}

async function main() {
  const report: StageResult[] = [];
  for (const users of stages) {
    const result = await runStage(users);
    report.push(result);
    console.log(JSON.stringify(result));
    if (result.stopped) break;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  console.log(JSON.stringify({ baseUrl: baseUrl.origin, requestsPerUser, report }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Load test failed");
  process.exitCode = 1;
});
