# JobPilot controlled submission automation

## Safety boundary

JobPilot never submits in the background. A submission is permitted only after the user opens the final review, resolves every blocking field, checks the authorization checkbox, and clicks **Submit application** for that one application. The approval expires after five minutes and cannot be reused.

`AUTOMATION_TEST_MODE=true` is the development default. Filling, validation, review, and approval still work, but `/api/automation/submit` refuses to grant the final click permit.

## Architecture

- The Chrome extension remains the primary browser controller. It scans and fills the page and shows the final-review controls.
- `automation/` contains the shared normalized model, validation, ATS adapters, Playwright driver, fixtures, and safety tests. Managed unattended submission remains disabled.
- Next.js server routes authenticate the short-lived extension session, verify ownership, persist metadata-only snapshots, issue one-time approval tokens, and create receipts.
- Supabase service-role credentials stay in Next.js server code. They never enter the extension or employer page.

Run `supabase/migrations/202608070007_submission_automation.sql` in Supabase SQL Editor. It creates `application_sessions`, `application_form_snapshots`, `submission_approval_tokens`, `application_receipts`, their indexes/RLS policies, and the private `automation-screenshots` bucket.

## Validation and question rules

Validation blocks final submission when a required field is empty, a required unknown field remains, a legal/generated answer lacks explicit approval, a sensitive required field is unresolved, a document is missing, visible validation errors exist, or CAPTCHA/login/MFA is active.

- `SAFE_PROFILE`: explicit profile values may be filled.
- `SAVED_USER_ANSWER`: only a meaning-matched answer owned by the user may be used.
- `GENERATED_TEXT`: Gemini output must be grounded, reviewed, and explicitly accepted.
- `SENSITIVE`: demographic and medical answers are never inferred or auto-filled.
- `LEGAL`: work authorization, sponsorship, clearance, conflicts, and similar answers are never guessed and require confirmation.
- `UNKNOWN`: a required unknown field blocks automated submission.

Greenhouse and Lever adapters use accessible labels and roles. Generic detection is review-only. `Next`/`Continue` may advance a known multi-step flow, but the final submit control is recognized separately and always needs a fresh server permit.

## Approval token and form hash

The review snapshot contains metadata such as field type, whether it is filled, its source, required/approval state, and the exact document-version IDs. Raw field answers and demographic values are not stored.

The server hashes the employer, job, required-field state, approvals, and document versions. The approval token references the user, application, submission session, and hash; only its SHA-256 hash is stored. It expires in five minutes. Immediately before clicking, the extension rescans the form and the server recomputes the hash. Any change returns `FORM_CHANGED` and requires a new review.

## Duplicate and retry protection

There is one active session per application, one approval per application/form hash, and one receipt per application. The token is claimed atomically before a click permit is returned. Existing `SUBMITTED` applications or receipts are rejected. Page loads, document downloads, and scans may be retried; a final submit is never retried automatically.

## CAPTCHA, login, and MFA

CAPTCHA produces `CAPTCHA_REQUIRED`; login and MFA produce their corresponding failure state. JobPilot pauses and asks the user to complete the employer step directly. It does not solve, outsource, hide, or bypass verification.

## Confirmation and receipts

DOM/URL evidence only produces a confidence signal. It never marks an application submitted by itself. The user must confirm success. The server then snapshots the exact approved resume/cover-letter versions, creates one `application_receipts` row with non-sensitive confirmation metadata, moves the application to `SUBMITTED`, and records audit events.

Screenshots are limited by the managed driver to review, confirmation, and error states. The bucket is private and `screenshot_path` is nullable; the extension does not request broad screenshot permissions. Avoid capturing pages containing unnecessary sensitive content.

## Build and fixture testing

Keep this in root `.env.local` during development:

```env
AUTOMATION_TEST_MODE=true
```

Commands:

```powershell
cd C:\Projects\my-website\automation
npm.cmd install
npx.cmd playwright install chromium
npm.cmd run typecheck
npm.cmd test

cd C:\Projects\my-website\extension
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Load `extension/dist` at `chrome://extensions` using **Developer mode → Load unpacked**. Connect it through a READY_TO_APPLY JobPilot application. The repeatable HTML fixtures are in `automation/fixtures`; Playwright loads them without contacting an employer.

For a real Greenhouse or Lever form, leave test mode on, open **Open assisted application**, fill safe fields, resolve required questions, open final review, and verify the extension says submission was prevented. Do not submit unless it is a legitimate application you intend to make.

For one intentional real submission: review every employer field, set `AUTOMATION_TEST_MODE=false`, restart Next.js, open a new short-lived assisted session, complete final review, check the specific authorization box, and click once. Confirm success only after the employer displays a real receipt/thank-you page. Immediately restore test mode afterward.

## Audit events and observability

Events include `SUBMISSION_SESSION_CREATED`, `FORM_VALIDATED`, `FINAL_REVIEW_OPENED`, `SUBMISSION_APPROVED`, `FORM_CHANGED_AFTER_APPROVAL`, `SUBMISSION_STARTED`, `CONFIRMATION_DETECTED`, and `SUBMISSION_CONFIRMED`. They contain ATS, confidence, counts, hashes, or timestamps—not passwords or answer content. `lib/automation/metrics.ts` aggregates counts, failure reasons, ATS totals, and average field counts without exposing private content.
