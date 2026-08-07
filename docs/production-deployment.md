# Production deployment

JobPilot uses three isolated environments: development, staging, and production. Each must have separate Supabase projects, Gemini keys/budgets, Redis databases, Stripe modes/webhooks, monitoring projects, extension origins, and domains. Never copy production secrets into preview deployments.

## Web: Vercel

Deploy the repository root to Vercel. Set `APP_ENV=production`, `APP_URL=https://yourdomain.com`, the matching `NEXT_PUBLIC_SITE_URL`, and all variables listed in `.env.example`. Configure the production domain and confirm SSL/HSTS before enabling users. Supabase Auth Site URL and redirect allow-list must include the production callback and reset URLs. Preview deployments should use staging resources—not production.

## Worker: Railway

Railway is the selected long-running worker host because it supports persistent services, health checks, private Redis connectivity, restarts, logs, and horizontal replicas. Deploy with repository-root build context and `worker/Dockerfile`; health path is `/health`. Set worker-only Supabase, Redis, concurrency, `APP_ENV`, and Railway-provided `PORT`. Never run ingestion as a Vercel cron/request handler.

## Extension

Build development with `npm --prefix extension run build`. Production requires:

```powershell
$env:JOBPILOT_PRODUCTION_ORIGIN="https://yourdomain.com"
npm.cmd --prefix extension run build:production
```

The generated manifest removes localhost API/origin access and restricts JobPilot access to that origin. Review permissions, privacy disclosure, screenshots, support URL, store assets, and Chrome Web Store policies manually; this project does not publish automatically.

## Deployment order

Backup, run migration 010 in staging, deploy compatible staging code, execute E2E/safety tests, deploy production-compatible code, run the reviewed production migration, configure Stripe webhook, start worker, verify both health endpoints, then enable low-risk flags. Keep `AUTOMATION_ENABLED=false` and `AUTOMATION_TEST_MODE=true` until an intentional launch review.
