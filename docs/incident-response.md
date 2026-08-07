# Incident response

## General

Declare an owner, record timestamps and affected systems, preserve redacted audit evidence, stop further harm with feature flags, communicate accurately, restore service, and write a blameless follow-up. Never paste credentials or private user content into tickets/logs.

- Database unavailable: return degraded health, stop mutations/worker scans, verify Supabase status, fail over/restore only through an approved runbook.
- Gemini unavailable: disable `AI_DOCUMENTS`; preserve drafts and allow non-AI product use.
- Worker or Redis unavailable: ingestion pauses; web remains available. Alert on stale `worker_instances` heartbeat and queue health, then restart/fail over Railway/Redis.
- Stripe webhook failure: do not grant client-reported access. Restore webhook delivery and replay idempotently from Stripe.
- Connector outage: disable the ATS/source; closure anomaly controls prevent mass closure.
- Extension API outage: users continue manually; never weaken authentication.
- Submission incident: set `AUTOMATION_ENABLED=false` and disable `AUTOMATED_SUBMISSION`; assisted/manual flow remains available.
- Secret exposure: revoke/rotate immediately, update all environments, invalidate sessions if relevant, audit access, and document scope.

Backups: enable and verify Supabase production backups/PITR according to the selected plan. Database backup does not automatically prove Storage object recovery; define a separate private-bucket export/restore process. Quarterly, restore into an isolated project, run integrity queries, verify private storage references, and document recovery time/data loss. Do not claim backups until a restore test passes.
