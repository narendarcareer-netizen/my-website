# JobPilot personalized matching

Phase 4 uses a deterministic scoring engine. It does not call an AI model, invent requirements, parse résumés, geocode locations, or guess whether a company sponsors visas.

## Scoring formula

Every match has a maximum of 100 points:

| Category | Weight |
| --- | ---: |
| Skills | 35 |
| Preferred title | 20 |
| Location and workplace preference | 15 |
| Employment type | 10 |
| Minimum salary | 10 |
| Work authorization | 10 |

The six component scores and overall total are stored in `job_matches`. Explanations are stored as three factual groups: `strong`, `gaps`, and `unknown`.

## Skill normalization

Manual and extracted skills are trimmed, lowercased, and deduplicated. A small alias map in `lib/matching/normalize-skill.ts` converts common equivalents:

- `js` → `javascript`
- `ts` → `typescript`
- `react.js` → `react`
- `nextjs` → `next.js`
- `nodejs` → `node.js`
- `postgres` → `postgresql`
- `golang` → `go`
- `k8s` → `kubernetes`

Keep this map deliberately small and maintainable. Do not add aliases unless two terms genuinely represent the same skill.

The deterministic job extractor scans the job title and sanitized description for a curated technical dictionary. Extracted values are stored in `job_skills`. Resume text is not parsed in this phase, so uploading a résumé does not invent resume-derived skills; users add those skills manually.

## Unknown data behavior

Missing source data receives a neutral score and an explicit `unknown` explanation:

- No extracted job skills: 25/35
- No preferred title: 14/20
- No location preference: 10/15
- Unknown employment type: 7/10
- Unknown salary: 7/10
- Unknown sponsorship: 8/10

These values prevent missing employer data from destroying an otherwise useful match. Explicit conflicts score lower. For example, a job that explicitly states it cannot sponsor and a user who requires sponsorship receives 2/10 for authorization. JobPilot does not infer sponsorship from a company name or location.

Title comparison removes punctuation and unhelpful common words, compares meaningful token overlap, and recognizes `intern`, `junior`, `associate`, `mid`, `senior`, `staff`, `principal`, `lead`, `manager`, `director`, and `vp`. Large explicit seniority gaps receive a substantial penalty.

## Database tables and security

Run `supabase/migrations/202608070003_job_matching.sql` after the Phase 2 and Phase 3 migrations.

- `user_skills` stores normalized user-owned skills, their source, and confidence. Row Level Security allows each user to manage only their own records.
- `job_matches` stores one row per user and job. Users can read only their rows. There are intentionally no client write policies; the server-side service-role calculation service is the only writer.

The unique constraints `(user_id, skill)` and `(user_id, job_id)` prevent duplicates. Indexes support user skill lookup, job lookup, and highest-score ordering.

## Recalculation triggers

Matches are recalculated server-side when:

- a user saves profile or job-preference changes;
- a work authorization is added or removed;
- a manual skill is added or removed;
- a résumé is uploaded or removed;
- an administrator imports new, changed, or closed jobs;
- the user chooses **Recalculate My Matches** on `/profile`.

The service loads preferences, skills, authorizations, active jobs, stored job skills, and existing matches in a small fixed number of queries. Scores are calculated in memory on the server and upserted in batches of 100. Pages read stored scores and do not recalculate on every visit.

## Test profile

On `/profile`, use:

```text
Preferred titles: Frontend Engineer, Software Engineer, Solutions Engineer
Preferred locations: Remote, New York
Remote preference: Remote
Employment types: Full-time
Minimum salary: 120000
Currency: USD
Skills: JavaScript, TypeScript, React, Next.js, Node.js, Git, Figma
```

Add your actual work authorization. Do not add false authorization information for testing.

Choose **Recalculate My Matches**. The result shows jobs evaluated, matches created, matches updated, and failures.

## Verification

Run the deterministic unit test:

```powershell
npm.cmd run test:matching
```

The test verifies that a relevant frontend role scores above an unrelated sales-director role, aliases deduplicate, missing salary receives a neutral score, and unknown sponsorship is not rejected.

To inspect stored results in Supabase SQL Editor while signed into the dashboard, use Table Editor for `job_matches`, or run an administrative count query:

```sql
select count(*) as matches,
       min(overall_score) as lowest,
       max(overall_score) as highest,
       count(distinct job_id) as unique_jobs
from public.job_matches;
```

For a single test user, `matches` and `unique_jobs` should be equal. Different roles should have different scores. `/jobs?sort=match` should show the highest scores first; changing the sort to newest or salary should change the order. `/dashboard` should display the same user's four highest active matches with real explanations.
