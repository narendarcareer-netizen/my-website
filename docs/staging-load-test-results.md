# JobPilot staging load-test results

Test date: August 8, 2026  
Target: `https://my-website-six-tau-32.vercel.app`  
Test type: safe, read-only, gradual concurrency review

## Executive result

The staging deployment completed all four stages without reaching a stop condition.
Across 1,110 requests there were no HTTP errors, Vercel 5xx responses, health-reported
database errors, or HTTP 429 rate-limit responses.

| Concurrent users | Requests | RPS | p50 | p95 | p99 | HTTP error rate | DB errors | 5xx/network | 429 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 60 | 17.11 | 205 ms | 889 ms | 1,798 ms | 0% | 0 | 0 | 0 |
| 25 | 150 | 65.66 | 94 ms | 660 ms | 692 ms | 0% | 0 | 0 | 0 |
| 50 | 300 | 171.56 | 98 ms | 251 ms | 398 ms | 0% | 0 | 0 | 0 |
| 100 | 600 | 250.25 | 129 ms | 688 ms | 749 ms | 0% | 0 | 0 | 0 |

The higher 10-user p99 is consistent with initial cold/warm-up requests. Later stages
had lower tail latency, although this short test is not sufficient to establish a
production latency SLO.

## Traffic and methodology

Each virtual user made six sequential read-only requests, with a 100 ms pause between
requests:

- `/`
- `/login`
- `/signup`
- `/api/health`
- `/jobs?page=1`
- `/jobs?page=2`

Stages were run at 10, 25, 50, then 100 concurrent users, with a two-second pause
between healthy stages. Requests used a 15-second timeout, did not follow redirects,
and did not bypass rate limiting.

Expected response distribution:

- 740 responses with HTTP 200
- 370 responses with HTTP 307

The 307 responses were the expected authentication redirects from the two `/jobs`
pagination URLs to `/login`.

The harness stops before the next stage when:

- HTTP error rate exceeds 5%
- `/api/health` reports database trouble
- network/5xx failures become material

The reusable harness is `scripts/staging-load-test.ts` and can be run with:

```powershell
$env:LOAD_TEST_URL="https://my-website-six-tau-32.vercel.app"
npm.cmd run test:staging-load
```

## Safety verification

No mutation, AI, billing, extension, automation, employer, or submission endpoint was
called. A read-only Supabase metadata check covering the test window reported:

| Table | New rows |
|---|---:|
| `applications` | 0 |
| `application_sessions` | 0 |
| `application_receipts` | 0 |
| `ai_usage` | 0 |
| `usage_events` | 0 |

Therefore the test produced:

- no duplicate or new applications
- no Gemini usage records or Gemini costs
- no submission sessions or receipts
- no employer traffic
- no Stripe Checkout traffic
- no destructive account operations

## Observability scope

“Vercel errors” in this report means HTTP 5xx or network failures observed by the test
client. The test did not have access to the Vercel project dashboard, function logs,
or Sentry project, so platform-internal warnings that did not affect HTTP responses
cannot be ruled out.

“Database errors” means failures returned by `/api/health`. It is not a substitute
for inspecting Supabase database metrics, connection saturation, slow-query logs, or
Postgres query plans.

## Authenticated coverage limitation

No dedicated staging test-account credentials were configured for this run. The test
did not attempt to discover, extract, or fabricate credentials. As a result:

- authenticated dashboard endpoints were not loaded
- the underlying Supabase jobs listing query was not load-tested
- jobs pagination was verified only at the authentication-routing layer

Before launch, configure a non-production staging test account and add a separate
authenticated scenario that uses a safely supplied short-lived session. That scenario
should measure `/dashboard`, real `/jobs` pages, and cursor/page transitions while
continuing to exclude document generation, billing, applications, and automation.

## Conclusion

The anonymous staging surface remained stable through the requested 100-concurrent-user
stage. This is a successful smoke/load review for public and authentication-routing
traffic, not yet a complete capacity result for authenticated database-heavy workflows.
