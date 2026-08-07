# JobPilot launch checklist

- [ ] Production domain and SSL verified
- [ ] Development, staging, production resources are isolated
- [ ] `.env.local` absent from Git and all exposed secrets rotated
- [ ] Production Supabase project, Auth URLs, SMTP, RLS, migrations, indexes reviewed
- [ ] Backup/PITR enabled and a restore tested
- [ ] Vercel `/api/health` returns healthy
- [ ] Railway worker `/health` returns healthy; heartbeat and queue connected
- [ ] Redis persistence/failover and backlog alerts configured
- [ ] Stripe live Products/Prices configured; signed webhook and portal tested
- [ ] Quotas and cost ceilings approved
- [ ] Sentry projects/alerts configured with PII redaction verified
- [ ] PostHog consent/retention and event payloads reviewed
- [ ] Feature flags tested; `AUTOMATION_ENABLED=false` kill switch tested
- [ ] Gemini key restricted, model/budget/rate limit/fallback verified
- [ ] Legal counsel reviewed Privacy, Terms, retention, processors, and automation consent
- [ ] Account export and deletion verified in staging
- [ ] Production extension manifest has no localhost permissions; store review prepared
- [ ] Unit, worker, Playwright, extension, production build all pass
- [ ] Staging E2E passes using fixtures and test Stripe—never fake live employer submissions
- [ ] 100-user/load tests recorded and bottlenecks accepted or fixed
- [ ] Incident owners, support contact, status communication, and restore runbooks assigned

Do not invite external users until every applicable item is checked with evidence.
