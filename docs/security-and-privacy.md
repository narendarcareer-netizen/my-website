# Security and privacy

Phase 10 adds CSP, HSTS in production, nosniff, strict referrer policy, denied framing, restricted browser capabilities, origin-checked production extension CORS, centralized rate-limit support, user export/deletion, consent records, immutable usage events, and admin-safe audit records.

Service-role, Stripe, Gemini, Redis, Sentry server, and worker credentials are server-only. Analytics and audit metadata must never contain passwords, access tokens, résumé text, demographic/legal answers, or generated document content. Sentry disables default PII and removes request bodies, cookies, and headers.

Account deletion requires the exact phrase `DELETE MY ACCOUNT`. It cancels an active Stripe subscription, removes private files, deletes the Supabase Auth user, and relies on cascades for user-owned records. Billing/audit rows designed with `on delete set null` may remain for legal/accounting purposes. Final retention periods, processor terms, jurisdictional rights, privacy/terms wording, and deletion verification require qualified counsel before launch.

State-changing browser routes require authenticated Supabase sessions; production extension requests require an allow-listed extension origin and short-lived bearer session. Stripe webhooks use the raw body and verified signature. Controlled submission additionally requires feature flag/kill switch, ownership, readiness, explicit fresh approval, form hash, unexpired token, quota, test-mode check, and idempotency.
