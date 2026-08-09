# Recruiter email tracking

## Overview

JobPilot connects to Gmail and Microsoft mailboxes with delegated OAuth. It never asks
for a mailbox password, never receives send-mail permission, and never sends email.
The Railway worker performs incremental reads outside the Next.js request lifecycle.

Only messages that pass a deterministic job-related filter are fetched for further
classification. Full message bodies are processed in worker memory and are not stored.
Stored metadata is limited to sender, domain, subject, provider message ID,
classification, confidence, match reasons, and received time.

## Migration

Run `supabase/migrations/202608080011_email_tracking.sql`.

The migration creates `email_connections`, `application_email_events`,
`email_sync_runs`, short-lived `email_oauth_states`, and durable
`email_sync_requests`. RLS restricts rows to their owner. Browser roles receive only
an explicit safe column list; encrypted token columns cannot be selected by clients.

## Google OAuth setup

1. Create or select a Google Cloud project and enable the Gmail API.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Web application client.
4. Add the exact redirect URIs below.
5. Add staging users to the OAuth test-user list while the app is in testing.
6. Configure `GOOGLE_EMAIL_CLIENT_ID` and `GOOGLE_EMAIL_CLIENT_SECRET`.

Scopes: `openid`, `email`, and
`https://www.googleapis.com/auth/gmail.readonly`. This permits reading but not
changing or sending mail. Google classifies Gmail read scopes as restricted and may
require verification/security assessment before broad production use.

Redirect URIs:

- Local: `http://localhost:3000/api/email/oauth/gmail/callback`
- Staging: `https://my-website-six-tau-32.vercel.app/api/email/oauth/gmail/callback`
- Production: `https://yourdomain.com/api/email/oauth/gmail/callback`

## Microsoft OAuth setup

1. Register an application in Microsoft Entra ID.
2. Choose supported account types. Use `common` for work, school, and personal
   accounts, or a tenant ID for tenant-only deployment.
3. Add a Web platform and the exact redirect URIs below.
4. Add delegated Microsoft Graph permissions `User.Read` and `Mail.Read`.
5. Configure the Microsoft environment variables.

Scopes: `openid`, `email`, `offline_access`, `User.Read`, and delegated
`Mail.Read`. No application-wide mailbox permission and no `Mail.Send` permission
is requested.

Redirect URIs:

- Local: `http://localhost:3000/api/email/oauth/microsoft/callback`
- Staging: `https://my-website-six-tau-32.vercel.app/api/email/oauth/microsoft/callback`
- Production: `https://yourdomain.com/api/email/oauth/microsoft/callback`

## Environment

Add to Vercel and Railway:

```env
EMAIL_TOKEN_ENCRYPTION_KEY=
GOOGLE_EMAIL_CLIENT_ID=
GOOGLE_EMAIL_CLIENT_SECRET=
MICROSOFT_EMAIL_CLIENT_ID=
MICROSOFT_EMAIL_CLIENT_SECRET=
MICROSOFT_EMAIL_TENANT_ID=common
```

Generate the encryption key with a cryptographically secure generator such as
`openssl rand -base64 32`. Use different keys per environment. Never use
`NEXT_PUBLIC_` for these values.

## Token security

Tokens are encrypted with AES-256-GCM. The key remains in hosting secret managers.
Tokens are decrypted only inside trusted server/worker code and are never logged.
OAuth state values are random, single-use, stored only as SHA-256 hashes, and expire
after ten minutes.

## Sync architecture

1. **Sync now** creates an idempotent `email_sync_requests` row.
2. Railway queues `SYNC_EMAIL_CONNECTION`.
3. The worker refreshes access when necessary.
4. Gmail page cursors or Microsoft delta links continue incremental processing.
5. Provider message IDs prevent duplicate processing.
6. Only likely job messages proceed to matching/classification.
7. Safe metadata, audit events, and notifications are written.

Active connections are scheduled approximately every 15 minutes. A partial unique
index and BullMQ job ID prevent concurrent duplicate syncs. Queue names for future
pipeline separation also include `PROCESS_EMAIL_MESSAGE` and
`MATCH_EMAIL_TO_APPLICATION`. Message bodies are deliberately not placed in Redis.

## Classification and matching

Rules recognize confirmations, recruiter replies, assessments, interviews, rejection,
offers, action required, general updates, and unknown messages. Matching scores
company text, title overlap, employer domain, ATS domain, and timing.

Gemini is not invoked for deterministic or unrelated messages. For a message that
passes the job filter but remains UNKNOWN, the worker may send only a redacted,
size-limited excerpt to Gemini. Output is structured and Zod-validated, email text is
explicitly treated as untrusted data, usage is recorded in `ai_usage`, and the result
is capped at MEDIUM confidence so it cannot automatically change application status.
This fallback runs only after the user enables **Allow AI classification**; otherwise
UNKNOWN messages remain review items without an AI request.

## Status transitions

Automatic updates require high confidence for both classification and application
matching, plus an allowed current status:

- confirmation: READY_TO_APPLY/APPLYING → SUBMITTED
- interview: SUBMITTED/APPLYING → INTERVIEW
- rejection: SUBMITTED/INTERVIEW → REJECTED
- offer: SUBMITTED/INTERVIEW → OFFER

Medium confidence, ambiguous wording, invalid current state, or weak matching creates
a Needs review item without changing the tracker. Low confidence remains unmatched.

## Privacy, disconnect, and deletion

Open `/settings/integrations/email` to connect, sync, pause, resume, or disconnect.
Disconnect attempts provider revocation where supported, deletes stored tokens,
clears the cursor, and stops sync. Derived application history remains.

Typing `DELETE EMAIL METADATA` deletes imported sender/subject metadata. It does not
delete or modify messages in the provider mailbox.

Admins have no mailbox-reading UI. Operational metrics may include counts and failures
but never message bodies or tokens.

## Testing

```powershell
npm.cmd run test:email
npm.cmd run worker:typecheck
npm.cmd run worker:test
```

Fixtures in `tests/fixtures/email` cover confirmation, recruiter reply, assessment,
interview, rejection, offer, unrelated, and ambiguous messages.

For staging, use a dedicated synthetic mailbox. Connect it, press **Sync now**, wait
for Railway, then inspect `/inbox`, `email_sync_runs`, and application timelines.
