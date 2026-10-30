# API, MCP, indexing and payments — release 0.1.7

Operator: AJ Digit, LLC (dba SITOCAL). Contact: contact@sitocal.com.

## What is implemented

- `/developer`: expiring, revocable, hashed API keys with explicit read/create/export scopes. Keys are shown once. Up to 20 active keys/account; 60 requests/minute/key and 100 API-created template drafts/day/key. Website plan capacity also applies.
- `/api/v1/sites`: bearer-authenticated list and template creation; `/api/v1/sites/{id}` reads an owned draft; `/export` returns its ZIP. Creates require `Idempotency-Key`. An identical retry returns the original result; changed input with that key is rejected.
- `/mcp`: stateless JSON-RPC/Streamable HTTP MCP supporting initialize, ping, tools/list and tools/call. Supported protocols: 2025-06-18 and 2025-03-26. GET returns 405 (no SSE listener). Origin and bearer authentication are enforced. No OAuth authorization server is provided; OAuth-only remote connectors are not supported.
- `scripts/mcp-stdio.mjs`: local stdio bridge for clients that launch a Node process. Set `SITOCAL_API_KEY` in the client's secret environment and `SITOCAL_MCP_URL=https://app.sitocal.com/mcp`. Command: `node /absolute/path/to/scripts/mcp-stdio.mjs`. Stdout contains JSON-RPC only. Never commit a real key to client configuration in a public repository.
- `/indexing`: verified GSC property selection, indexed-version URL inspection, sitemap listing/submission, persistent bulk inspection batches, per-URL results and CSV export. Up to 100 URLs/batch and 200 queued inspections/account/day. Reads interrupted by a restart are requeued; sitemap writes are not automatically retried. Failed checks are not classified as unindexed URLs. Batch reports refresh on request.
- `/billing`: Stripe card checkout integration, signed webhook reconciliation, subscription portal, website capacity and collapsible manual-payment methods. Manual methods display “Request payment instructions.” No public bank/account details were supplied or published.

## Stripe configuration in Render

Do not paste merchant secrets into chat, source files or GitHub. Add them directly to the existing Render service's Environment screen.

1. Begin with Stripe **test mode**. Create three active USD recurring monthly prices: Starter $10, Growth $50, Agency $100. Each must have an interval count of 1 and match the published amount. Record the three `price_...` identifiers.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, and `STRIPE_PRICE_AGENCY` in Render.
3. Create a Stripe webhook endpoint at `https://app.sitocal.com/api/billing/webhook`. Subscribe to `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Use matching test/live mode throughout.
4. Configure Stripe's customer portal for payment-method management and cancellation. **Disable portal plan switching for this alpha**: metadata-aware automatic upgrades/downgrades are not implemented. Plan changes and canceled-account resubscription need merchant reconciliation/support before a new checkout. Never pay twice to resolve a stale checkout.
5. Review policy drafts and the commercial refund/cancellation wording before accepting real payments. Set `BILLING_ENABLED=true` only after merchant setup and test-mode verification. The app keeps checkout disabled when configuration is incomplete.
6. Verify test checkout, paid invoice, duplicate webhook delivery, failed payment and cancellation. Do not use a live charge as the first test. Then switch to corresponding live keys, prices and webhook secret when ready.

Stripe checkout is server-priced. A return URL never activates a plan. Signed events reconcile the current subscription and paid invoice with Stripe. Signature timestamps have a five-minute tolerance; duplicate events are idempotent and reconciliation is serialized. Existing pending/unknown checkouts are reused or require reconciliation to avoid duplicate charges. No automatic retry of an ambiguous checkout write uses a different idempotency key.

Website capacity: Free 1, Starter 5, Growth 15, Agency 100 **saved websites** (not new generations/month). Existing sites are preserved after a downgrade; new drafts are blocked above capacity. No separate AI or rank/index usage allowances were supplied; provider costs remain separate. Enterprise terms are custom.

## Manual payments

Customers request PayPal, AliPay, Wise, bank transfer or custom payment instructions via `/contact?payment=...`; the form preselects a payment enquiry. No request or self-reported receipt automatically grants access.

After independently verifying receipt, the operator may run on the service shell:

```text
npm run billing:grant -- --verified --email CUSTOMER_EMAIL --plan starter --expires FUTURE_ISO_DATE --reference VERIFIED_RECEIPT_REFERENCE
```

The command records a time-limited grant (maximum one year); it does not collect money. Receipts and account references remain private runtime data. Plan changes and expiry should reflect the agreed paid period. Do not run this merely because a customer sent a screenshot.

## Google configuration

Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the registered `GOOGLE_REDIRECT_URI` on Render, with Search Console API enabled in the Google project. Keep the current encryption key and disk. Users connect their own Google account and select an accessible verified property.

Existing read-only connections can inspect URLs/list sitemaps. Use **Authorize sitemap writes** to request Google's `webmasters` scope, then approve it in Google's consent screen. Submission also requires owner/full-user property access and explicit in-app confirmation.

URL inspection reports Google's indexed version, not a live crawl or an indexing request. Ordinary service-page indexing is not covered by Google's restricted JobPosting/BroadcastEvent Indexing API. This release does not offer third-party backlink indexing, instant/guaranteed modes, credit packs or automatic refunds for indexing outcomes. A third-party engine is a later integration, as requested.

## Validation and limits

Fixture tests cover scopes, ownership, revocation/expiry, idempotency, plan capacity, Google property containment, queued-job results/failures, Stripe signatures, paid-state reconciliation and manual-grant expiry. Browser QA covers local account navigation, tool forms and explicit missing-configuration states. No live Stripe payment, Google consent flow or real Search Console property has been exercised by the agent.

References: [MCP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), [Google URL inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect), [Google sitemap submission](https://developers.google.com/webmaster-tools/v1/sitemaps/submit), [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature).
