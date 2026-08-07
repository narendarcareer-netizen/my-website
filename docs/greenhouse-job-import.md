# Greenhouse job import

JobPilot imports published roles from Greenhouse's official, public [Job Board API](https://developers.greenhouse.io/job-board.html). It does not automate a browser, scrape restricted pages, or submit applications.

## How the connector works

1. An administrator saves a company and its Greenhouse board identifier on `/admin/job-sources`.
2. The server requests `https://boards-api.greenhouse.io/v1/boards/{identifier}/jobs?content=true`.
3. The connector validates and normalizes each published job, sanitizes its description, infers basic work/employment details when possible, and calculates a SHA-256 content hash.
4. The import service uses the private Supabase service-role client to upsert catalog records. This credential is never sent to the browser.
5. Job skills are refreshed, and jobs missing from the latest complete board response are marked `closed` rather than deleted.

Requests time out after 15 seconds and retry temporary network, rate-limit, and server failures up to three times with exponential backoff. The admin action allows five imports per administrator per ten-minute window on each running application instance.

## Required setup

Run `supabase/migrations/202608070002_greenhouse_jobs.sql` in **Supabase → SQL Editor** after the Phase 2 migration. This creates:

- `companies`
- `jobs`
- `job_skills`
- `saved_jobs`
- indexes, unique constraints, and Row Level Security policies

Add these server settings to the root `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
ADMIN_EMAILS=your-login-email@example.com
```

Find the service-role key in **Supabase → Project Settings → API**. It is a secret that bypasses Row Level Security. Never prefix it with `NEXT_PUBLIC_`, paste it into client code, commit `.env.local`, or share it in screenshots or chat.

`ADMIN_EMAILS` accepts multiple comma-separated Supabase account emails:

```env
ADMIN_EMAILS=owner@example.com,developer@example.com
```

Restart the development server whenever `.env.local` changes.

## Add and import a company

1. Sign in with an email included in `ADMIN_EMAILS`.
2. Open `http://localhost:3000/admin/job-sources`.
3. Enter the company name, Greenhouse board identifier, careers URL, and optional website.
4. Choose **Save source**.
5. Choose **Import Jobs** beside the saved source.
6. Review the imported, updated, unchanged, closed, and failed counts.

The board identifier is the token used by Greenhouse's public endpoint. Only use known public boards that the company exposes normally.

### Tested local example

```text
Company name: Figma
Board identifier: figma
Careers URL: https://www.figma.com/careers/
Website URL: https://www.figma.com/
```

The public `figma` board returned 167 real listings during Phase 3 verification on August 7, 2026. Public boards change over time, so a later count can differ.

## Duplicate prevention

Companies are unique by `(ats_type, ats_identifier)`. Jobs are unique by `(company_id, ats_type, external_id)`. Supabase upserts against these constraints, so rerunning an import does not create copies.

Each job also has a stable content hash based on its meaningful source content. If the hash and status have not changed, the importer counts the job as `unchanged` and skips its database update. Changed jobs retain the same database ID and are counted as `updated`.

## Closed jobs

After a successful complete board fetch, the importer compares the external IDs with previously active jobs from that company. Previously imported jobs missing from the current response are updated to `status = 'closed'`. They are never deleted, preserving saved-job references and history.

Normal users can read active jobs only. Closed jobs remain available to trusted server-side maintenance operations.

## Confirm the import in Supabase

Open **Table Editor** and check:

1. `companies` contains the saved company and board identifier.
2. `jobs` contains rows linked through `company_id`.
3. Imported rows have `ats_type = greenhouse`, a real `external_id`, `source_url`, `apply_url`, and `content_hash`.
4. `job_skills` may contain skills detected in each description.

You can also run this read-only SQL query:

```sql
select c.name, j.status, count(*) as job_count
from public.jobs j
join public.companies c on c.id = j.company_id
group by c.name, j.status
order by c.name, j.status;
```

Then open `/jobs`. The displayed count and company names should match active rows in Supabase. Opening a card should lead to `/jobs/{id}`, where the source and apply links point to the employer.

## Troubleshooting

- **Redirected away from the admin page:** Sign in with the exact email listed in `ADMIN_EMAILS`, then restart the server.
- **Administration is not configured:** Add `SUPABASE_SERVICE_ROLE_KEY` to the root `.env.local` and restart.
- **Source cannot be saved:** Run the Phase 3 SQL migration and verify the service-role key belongs to the same Supabase project as the project URL.
- **Greenhouse returns 404:** Check the board identifier. It is not necessarily the company's name or careers-page path.
- **Greenhouse returns 429 or 5xx:** Wait and retry; the connector already performs three temporary-failure attempts.
- **Jobs are empty:** Confirm the source is active, the import counts were nonzero, and the jobs have `status = active`.
- **Descriptions look incomplete:** Greenhouse only returns content published by the employer. JobPilot does not invent missing content.
- **A résumé or personal detail appears in logs:** Stop the server and investigate. JobPilot's importer logs only company/source identifiers and numeric results, never user records, credentials, or application content.
