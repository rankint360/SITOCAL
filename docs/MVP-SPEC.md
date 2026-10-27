# MVP specification
Version 0.1 — 2026-10-27 — Proposed; awaiting design and scope decisions.

## Core journey
Owner creates workspace → adds verified business details → chooses services/coverage → reviews proposed page map and estimated credits → selects website template → generates drafts → reviews facts and edits sections → previews desktop/mobile → publishes → verifies domain → receives enquiries → adds tracked keywords → reviews dated SERP observations → improves relevant pages.

## Launch scope and acceptance criteria
| ID | Capability | Required behavior and acceptance |
|---|---|---|
| MVP-01 | Identity and workspace | Email sign-in/recovery, owner/editor membership; unauthorized reads and writes fail across all tenant entities and storage paths. Owner controls billing and members. |
| MVP-02 | Business profile | Name, real address or service-area mode, country, timezone, phone, email, hours, services, coverage and brand assets; required fields validated; no forced fake public address. |
| MVP-03 | Website plan | Editable home/services/location/about/contact/blog structure; show page counts and estimated usage before generation; duplicate slugs rejected. Default cap 30 pages/site pending costing. |
| MVP-04 | AI drafting | Structured output from approved business facts, service and local context; queue/progress/cancel/retry; store model/prompt version and spend; drafts never auto-publish; unsupported claims marked for review. |
| MVP-05 | Original templates | Three responsive customer-site templates with shared section schema; business assets and global colors/fonts; template switch preserves compatible content and warns about unsupported sections. SaaS UI concepts are separate from these templates. |
| MVP-06 | Editing and revision | Section reorder/hide, text/media/CTA edits, save status, immutable revisions, restore, desktop/mobile preview; sanitize rich text and URLs; no arbitrary customer JavaScript at launch. |
| MVP-07 | Technical SEO | Editable title/description/canonical, one primary heading, valid LocalBusiness/Service schema from facts, sitemap, robots, internal-link checks, image alt text, redirects for changed live slugs; preview noindex. |
| MVP-08 | Publish and export | Managed subdomain, one custom-domain method with ownership verification/TLS state, immutable build, failure logs, atomic publish, rollback and static ZIP; export states that forms need endpoint configuration. |
| MVP-09 | Leads | Contact form, validation/spam controls, consent copy where appropriate, inbox/status/CSV, email notification retry; durable lead stored before email; email failures visible; click-to-call/WhatsApp are links, not verified call attribution. |
| MVP-10 | Organic SERP engine | Keyword + location + language + device + search engine + target-domain configuration; manual and daily scheduled checks; top-100 organic position, ranking URL, dated history, result inspection and CSV. See contract below. |
| MVP-11 | Competitor comparison | Up to three domains per project matched against the same SERP snapshot; visible matching rule; ranked/unranked counts; no fabricated traffic or keyword difficulty. |
| MVP-12 | Billing and usage | Plans/entitlements, monthly allocation, hard spend limits, usage ledger, invoice portal and verified signed webhooks; replay/retry must not double-credit or double-charge. Trial quotas decided after abuse/cost spike. |
| MVP-13 | Admin and operations | Account/job lookup, provider health, audit log, support-safe actions, deletion/export workflow, backup/restore runbook; privileged actions logged. |

## Explicitly after launch
Local-pack rank tracking, geographic grid scans, Google Business Profile management, Search Console OAuth and URL inspection, scheduled client reports, white-label agency portals, granular client seats, WordPress/Elementor conversion, image generation, blog autopublishing, backlinks/citations, advanced keyword metrics, public REST API, scoped API keys, MCP, multiple hosting targets and multilingual generation. Add only after core activation and margins are proven. Maintain these as parity backlog; do not silently drop them.

## SERP engine contract
This means an integrated rank-research and monitoring module, not a general internet search engine or a proprietary Google crawler. Use a supported external SERP provider behind an internal adapter.

Input: workspace/project, normalized keyword, provider-supported location ID (with display label), language, device, engine, target hostname and optional subdomain matching. Default Google organic; configuration changes create a new series rather than corrupt history.

Normalize output: provider task ID, requested/observed timestamps in UTC, location/device/language, result depth, status, cost, organic position, absolute result position where provided, URL, title, result type and matched domain. Organic position excludes ads and other blocks. Default target matching is exact hostname plus www equivalent; optional subdomains are explicit. Compare competitors using the same snapshot. Store raw payload with restricted retention for debugging.

States: queued → dispatched → waiting → completed; terminal failed/cancelled. Provider timeout retries with exponential backoff and jitter; cap attempts; dead-letter failures; task submission uses stable idempotency key. Reconcile unknown provider outcome before redispatch. Accept signed callbacks if available, otherwise bounded polling. Enforce per-tenant and global concurrency and budget caps.

Represent not-found-within-depth, provider failure, pending and no-history separately. Never turn timeout into rank 101. Rank movement compares successful observations with identical configuration; a smaller position is improvement. Show last successful check and stale state. Daily jobs use workspace timezone, avoid duplicate periods, and preserve UTC storage. On-demand checks consume quota or show insufficient credits before queueing.

Geo-grid later: sample coordinates, grid size/radius, place identity and map-specific provider contract. Cost is keywords × points × scans × device/configuration count. Do not label organic city results as map-grid coverage.

## Data model
Every tenant-owned table carries workspace_id; enforce it in database policies plus server authorization. Composite references prevent cross-tenant associations.

- users; workspaces; memberships (unique workspace/user, role)
- businesses; services; service_areas; assets
- sites (unique active hostname); site_domains (verified ownership and TLS status)
- pages (unique site/slug); page_revisions; theme_settings; content_briefs
- generation_jobs; job_events; provider_requests (idempotency and spend)
- deployments (artifact checksum, version, status); redirects
- leads (retention and consent metadata); notification_deliveries
- rank_projects; tracked_queries (full configuration fingerprint); competitors
- serp_runs; serp_results; rank_observations (unique run/target)
- plans; subscriptions; entitlement_snapshots; usage_ledger; credit_reservations
- webhook_events (unique provider/event ID); audit_events

## Internal endpoint outline
POST /workspaces; POST /businesses; POST /sites; POST /sites/:id/plan
POST /sites/:id/generations; GET /jobs/:id; POST /jobs/:id/cancel
PATCH /pages/:id; GET /pages/:id/revisions; POST /pages/:id/restore
POST /sites/:id/preview; POST /sites/:id/deployments; POST /sites/:id/rollback
POST /sites/:id/domains; GET /sites/:id/export
POST /public/sites/:publicId/leads; GET /sites/:id/leads
POST /rank-projects; POST /rank-projects/:id/queries; POST /rank-projects/:id/checks
GET /rank-projects/:id/history; GET /rank-projects/:id/export
POST /billing/checkout; POST /webhooks/billing; POST /webhooks/serp

All private endpoints require session, workspace membership, role and entitlement checks. Mutating job endpoints use idempotency keys. Validate payload sizes, rate limits and CSRF/origin protection. Public IDs are not authorization for private endpoints. Do not expose provider credentials to clients.

## Interface inventory
Workspace overview; sites list; eight-stage setup wizard; page-map review; section editor with preview; content review queue; publishing/domain status; leads inbox/detail; SERP projects/keywords/history/result drawer; usage/billing; members/settings; support admin. Every async screen needs empty, loading, stale, failed, retry and permission-denied states. Use keyboard access, visible focus, readable contrast and status labels alongside color.

## Engineering gates
Unit checks: slug rules, domain matching, organic normalization, movement and credit accounting. Integration checks: tenant isolation, job retries/cancellation, provider callback replay, webhook replay and role permissions. End-to-end: setup → draft → edit → preview → publish → lead; keyword → check → history → export; domain verification → TLS → rollback. Provider fixtures cover not-found, timeout, malformed response and rate limiting.

Quality targets: published pages usable at 360px, keyboard navigation and WCAG AA contrast; no broken internal links; valid sitemap/canonical/schema; p75 LCP ≤2.5s and CLS ≤0.1 on representative field data after launch (lab checks before launch); signed uploads with MIME/size restrictions; output sanitization and secret redaction; encrypted transport and managed encrypted storage. External URL retrieval must block private/internal network targets and revalidate redirects.

Operational gate: structured logs with request/job IDs, provider spend alerts, queue-age alerts, health checks, migrations, staging/production separation, daily backup and demonstrated restore. Proposed RPO 24h, RTO 8h; validate before promising. Export/delete workflow and retention rules must be documented before real customer leads enter the service.

## Beta definition of done
Five real businesses can complete the core journey; no critical security or billing issues; repeat operations preserve balances; failed publish leaves previous site working; backup restore exercised; support playbook and privacy/terms reviewed; API spend is measured and bounded. Founder approves pricing, launch market and production release.

## Open decisions
D01 UI direction; D02 primary market/country and language; D03 operating entity/payment eligibility; D04 budget and delivery capacity; D05 managed hosting vs bring-your-own priority; D06 organic-only launch versus adding local pack; D07 provider choices after spikes; D08 retention/quotas. Defaults are English, agency-first, managed hosting and organic-only MVP. These are assumptions awaiting confirmation.

## Session 009 scope override
User now includes WordPress conversion, Google GSC/GA4, multiple repository/deployment providers and registrar search in the build scope. These supersede the earlier after-launch deferrals. Implementation state and remaining gaps are recorded in IMPLEMENTATION-REGISTER.md; no feature is complete merely because scope changed. Rankleem/Orchard approved; domain owned by user.
