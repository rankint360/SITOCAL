# Sitocal development roadmap
Updated 2026-10-29. Owner-approved scope: full local-service website platform, Pakistan first. Existing Render/Cloudflare domain cutover passed user checks. This roadmap replaces the assumption that adapters alone mean completed features.

| Stage | Deliverable | Acceptance evidence | Current state |
|---|---|---|---|
| 1 | Substantial website drafts, business brief, service navigation and responsive layouts | Distinct full page plan; internal link checks; escaping; editor/revision/import/export regression; desktop/mobile visual QA | Implemented in 0.1.2; automated tests pass; visual/live QA pending |
| 2 | Business-specific content, media and SEO lifecycle | Real editable assets; page management; canonical URL/sitemap/schema on known published domain; preview-to-export parity; no fabricated claims | Pending; templates still generic advice without a detailed brief |
| 3 | Reliable publish/deploy workflow | Per-project destination; provider auth; job state/reconciliation; build status polling; failure handling; controlled live GitHub and hosting tests | Existing adapters only; end-to-end verification pending |
| 4 | WordPress compatibility | Disposable WordPress instances; native Elementor/Gutenberg tests; Divi4 import evidence; explicit Divi5 implementation; media/link/style review | Native-content exporters exist; real install QA and fidelity pending |
| 5 | SERP and Google reporting | Provider-cost controls; project/property binding; real rank checks; GSC/GA4 comparison; charts/export; scheduled durable jobs | Adapter/fixture tests only |
| 6 | Production identity and accounts | Verified email; expiring recovery; org roles; session/abuse/security review; backups with restore evidence; privacy/deletion workflow | Single-owner alpha accounts; signups closed per user |
| 7 | Commercial launch | Billing/webhook idempotency; usage quotas/budgets; monitoring; load tests; rollback runbook; legal/pricing review; controlled Pakistan beta feedback | Pending |

Engineering rules: one reviewable stage at a time; update STATUS.md/build register; distinguish fixture/live evidence; never reset production database or rotate encryption key during release; preserve legacy import compatibility. Source destination ONLY rankint360/SITOCAL. No external paid API actions until configured and scoped. Existing customer-site content is not overwritten by new templates; old saved pages receive updated rendering only. Rollback by redeploying previous known commit with same disk/key; no destructive schema migration in 0.1.2.

0.1.2 release QA: generate with one and eight services; names Home/About/Contact and normalized collisions; supply real business brief; verify all page links; editor/save/refresh; export ZIP/index and WordPress content; desktop/mobile rendering; legacy imported ZIP. AI output remains a paid-provider draft and must be reviewed. Browser automation unavailable during initial session; preview saved for manual inspection.
