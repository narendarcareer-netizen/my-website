# Billing and quotas

Stripe-hosted Checkout and Customer Portal keep payment details out of JobPilot. Configure Starter and Pro Products/Prices in each Stripe environment, place Price IDs in `subscription_plans` (or use the documented environment values during provisioning), and register `/api/stripe/webhook`. Subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`.

The webhook signature is mandatory and `billing_events.stripe_event_id` makes processing idempotent. Webhooks—not client claims or checkout redirects—control subscription status.

Limits live in `subscription_plans.limits`, not UI pricing code. `checkLimit` reads the server-owned subscription and immutable `usage_events`. Current operations are AI analysis/documents, matching, assisted sessions, and controlled-submission attempts. Product pricing and exact limits must be approved before setting live Stripe Price IDs.

Use Stripe CLI in staging to forward and test signed events. Verify duplicate delivery, cancellation, plan change, past-due payment, and portal access. Never use live keys in development.
