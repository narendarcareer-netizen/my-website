# Staging E2E procedure

Use an isolated staging Supabase project, Stripe test mode, staging Gemini budget, staging Redis, `AUTOMATION_TEST_MODE=true`, and fixture employer pages. Create dedicated staging accounts through the normal signup flow—never hardcode passwords in the repository.

Run: signup → confirm email → complete profile/consents → upload a non-sensitive synthetic résumé → import fixture job → calculate match → save job → generate/approve documents → add application → open extension fixture → fill safe fields → final review/approval → verify test-mode blocks live click → use the local confirmation fixture → confirm receipt/tracker.

Verify each database ownership boundary with a second test user. Stripe CLI must replay duplicate signed events. No test may submit a fake application to a real employer. Capture pass/fail evidence and remove staging-only test data under the documented retention policy.

Automated safety checks run in `automation/tests/production-safety.spec.ts`; interactive authenticated staging setup remains intentionally manual until CI receives protected staging credentials.
