# Application pipeline

Phase 6 keeps applications manual. JobPilot prepares, records, and tracks work, but never submits an employer form. The user must click **Apply on employer site** and later confirm the outcome.

## Setup

Run `supabase/migrations/202608070005_application_pipeline.sql` in the Supabase SQL Editor after migrations 001–004. It creates `applications`, `application_events`, `application_notes`, `application_documents`, and `notifications`, including indexes, ownership policies, and duplicate constraints.

## Statuses and transitions

The normal path is `SAVED → PREPARING → NEEDS_REVIEW → READY_TO_APPLY → APPLYING → SUBMITTED → INTERVIEW → OFFER`. Rejection, withdrawal, failure, user-action, and archive branches are defined in `lib/applications/status-rules.ts`. Normal actions are rejected when a transition is invalid. Tracker corrections require a deliberate selection and confirmation and are recorded as events.

## Readiness

`lib/applications/check-readiness.ts` loads application, job, and drafts in batches. A resume must be approved. A cover letter is required only when the job description explicitly says so; otherwise it is optional, although an existing cover draft must be approved before selection. Approved draft IDs are stored on the application. Document approval automatically rechecks an existing queued application.

## Manual submission and snapshots

**Apply on employer site** opens the stored employer URL in a new tab and moves the record to `APPLYING`; it does not fill or submit anything. When the user chooses **Yes, submitted**, readiness is checked again. The newest exact version belonging to each selected approved draft is written to `application_documents` before the status becomes `SUBMITTED`. Later draft edits therefore cannot change the submission record.

## Security and duplicates

Every action authenticates the user and scopes database lookups by `user_id`. RLS prevents cross-user reads and writes. Audit events and snapshots have no client insert policy and are created with trusted server code. `unique(user_id, job_id)` prevents duplicate applications. Event dedupe keys protect repeated creation and transition clicks.

## Test the full flow

1. Open an active Figma job and click **Add to queue** twice; both visits must lead to one application.
2. Start preparing, generate documents, and approve the resume and cover letter.
3. Open the application and click **Check readiness**; verify `READY_TO_APPLY`.
4. Click **Apply on employer site**. Return without any automatic filling.
5. Click **Yes, submitted** and verify `submitted_at`, audit events, and two exact snapshot rows where applicable.
6. In Tracker, deliberately move the application to `INTERVIEW` and confirm the column changes.
7. Add a note and verify the timeline and dashboard statistics.
8. Confirm a closed imported job displays a warning but its application remains.

Run `npm.cmd run test:application-pipeline`, TypeScript, ESLint, and the production build before release.
