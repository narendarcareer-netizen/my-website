# JobPilot scalable job-ingestion platform

## Architecture and queue choice

Phase 9 keeps Next.js as the web/admin application and adds an independently runnable `worker/` package. The worker uses **BullMQ + Redis** for durable jobs, delayed scheduling, atomic job IDs, concurrency control, and backoff without coupling processing to Vercel request limits.

The web app writes source configuration and CSV onboarding records to Supabase. The worker detects pending sources, schedules rows whose `next_scan_at` is due, and executes scans through BullMQ. Service-role access remains server/worker-only.

Run `supabase/migrations/202608070008_scalable_job_ingestion.sql`. It adds career sources, scan runs, job history, onboarding batches/items, alerts, source ownership, closure counters, canonical URLs, search indexes, and worker-only RLS boundaries.

## Connectors and access policy

Every `JobSourceConnector` implements detection, fetch, normalization, health check, and a version. Greenhouse, Lever, Ashby, SmartRecruiters, and Workable use their public job-board endpoints and normalize into one schema. Connector versions are stored in scan runs and job metadata.

Workday and generic crawling are deliberately not enabled. Workday needs tenant-specific fixtures. A future generic connector should prefer JobPosting JSON-LD and sitemaps, honor site policy/robots restrictions, and disable sources requiring authentication, CAPTCHA, or bypassing access controls.

## Local development

Worker-only values (never `NEXT_PUBLIC_`):

```env
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-value
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=5
```

```powershell
docker run --name jobpilot-redis -p 6379:6379 redis:7-alpine
cd C:\Projects\my-website\worker
npm.cmd install
npm.cmd run dev
```

Run the web app separately with `npm.cmd run dev`. Scan one source with `npm.cmd run jobs:scan -- --source=<source-uuid>`.

## Companies and bulk onboarding

Open `/admin/companies`. For Lever, enter a URL such as `https://jobs.lever.co/company-token`; detection extracts the token and schedules the source. Low-confidence URLs are disabled for review.

CSV accepts up to 1,000 rows with `company_name,website_url,careers_url`. The request creates `PENDING` records; the worker moves them through `DETECTING` to `CONFIGURED`, `NEEDS_REVIEW`, or `FAILED`, avoiding a long web request.

## Scheduling, rate limits, and failures

`next_scan_at` drives scheduling. Healthy intervals range from 15 minutes to 30 days (default 120 minutes). Failures use exponential backoff capped at 24 hours plus jitter. BullMQ job ID `scan-<source_id>` prevents concurrent duplicate scans.

Requests have a 15-second timeout and host pacing. HTTP 408, 429, 500, 502, 503, 504 and network timeouts retry with exponential backoff, jitter, and `Retry-After`. Authentication/access/404 and invalid configuration are permanent. For multi-worker production, use provider-specific queues or BullMQ groups for distributed per-host limiting.

## Deduplication, history, and raw metadata

Primary identity is `source_id + external_id`. Canonical apply URL is the secondary unique key. A conservative company/title/location/content fingerprint is available for review; uncertain records are never aggressively merged. Sanitized descriptions and normalized text prevent meaningless formatting history. Important title, location, salary, description, and status changes create `job_change_history`.

Scan runs store counts, response hashes, parser version, timing, and limited metadata—not indefinite full HTML payloads.

## Anomaly and closure protection

A missing job increments `missing_scan_count`; only its third confirmed normal absence closes it. Reappearance resets the count. A source with at least 10 prior jobs returning zero or losing at least 95% becomes `ANOMALY`; closures pause and a critical alert is created. This prevents parser defects from mass-closing jobs.

## Health, monitoring, matching, and search

Success marks a source healthy and resets failures. One/two failures are degraded; three are failing; manual shutdown is disabled. `/admin/job-sources/monitoring` shows totals, daily discoveries, failure rate, never-scanned/failing sources, and alerts. Logs contain source/scan IDs, connector, duration, counts, status, and error code only.

Scans do not synchronously recalculate all users. New/changed job IDs belong on the `RECALCULATE_MATCHES` queue in bounded batches. PostgreSQL indexes cover status, source, company, date, location/employment, and full-text content. Move every large catalog view to cursor pagination before high-volume production.

## Tests and scale simulation

```powershell
npm.cmd run worker:typecheck
npm.cmd run worker:test
npm.cmd run jobs:load-test
```

The simulation schedules 1,000 unique source keys and checks anomaly protection. Connector tests cover all five providers, detection, normalization, health, and queue identity.

In a development Supabase project only:

```powershell
$env:ALLOW_SYNTHETIC_DATA="true"
npm.cmd run jobs:seed -- --count=10000
npm.cmd run jobs:seed -- --count=100000
```

The seed command batches 1,000 rows and prints representative query times. Use Supabase `EXPLAIN (ANALYZE, BUFFERS)` for authoritative measurements. Never run synthetic seeding in production.

## Before 50,000 sources

JobPilot does **not** claim 50,000 configured and monitored sources. Before that scale: deploy multiple isolated workers; use managed Redis persistence/failover; enforce distributed per-provider limits; add cursor pagination everywhere; partition/archive scan history; add backlog and connector-wide alerts; batch matching fan-out; load-test millions of jobs; establish retention/SLOs and robots-policy review; and prove reliability through progressively larger monitored cohorts.
