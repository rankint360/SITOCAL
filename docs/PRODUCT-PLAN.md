# Product plan — Local Service Website Builder

Prepared: 2026-10-27 (Asia/Karachi). Working descriptor only; product name not selected.

## Product decision
Build one workspace for creating credible local business websites, publishing them, collecting enquiries, and measuring search visibility. Initial buyer: small agencies managing 3–20 local service clients. Secondary buyer: a single service business. First release: English, one supported deployment provider, Google organic tracking, desktop and mobile results, manually verified business facts.

This delivery is a comprehensive MVP specification and design exploration, not a functioning SaaS. No production code, subscriptions, domains, integrations, or deployment have been created.

## Research and parity ledger
Public-page review on 2026-10-27:

| Reference | Observed capability | MVP decision | Evidence state |
|---|---|---|---|
| https://ranklocal.cc/ | AI content and images; service and location pages | Include reviewed AI content; uploads first, image generation later | Public marketing claims; account behavior not tested |
| https://ranklocal.cc/ | Themes, visual editing, deployment, downloadable bundle | Three original templates; section editor; managed hosting; static export | Public claims |
| https://ranklocal.cc/ | Keyword research, internal links, SEO metadata, rankings | Include explicit content planning and organic SERP tracking | Public claims; tracking depth unverified |
| https://ranklocal.cc/ | Leads, API/MCP, WordPress conversion and indexing tools | Leads at launch; API/MCP and WordPress later; indexing diagnostics only | Public claims/navigation; implementation unverified |
| https://www.ranklocal.site/ | Unknown | Revisit before any full-parity promise | Direct access failed; search returned no results |
| https://serplocal.cc/ | Unknown | Proposed SERP specification below is original, not verified parity | Direct access failed; search returned no results |

Similar workflows are the reference, not copied branding, templates or assets. Full feature parity cannot be certified from public material alone. Remaining research: accessible demos or account walkthroughs, complete feature inventories, export formats, provider terms, and trial behavior.

## Delivery plan
Estimates assume one experienced full-stack developer with AI assistance and timely decisions. They are planning ranges, not delivery commitments.

| Phase | Duration | Deliverable | Exit gate |
|---|---|---|---|
| Discovery and UI | 1 week | Current documents, reference gaps, selected direction, approved scope | User selects design; target market and launch limits confirmed |
| Foundation | 1–2 weeks | Auth, organizations, tenant access, DB migrations, environments, job skeleton | Cross-tenant access denied in automated tests |
| Builder | 2–3 weeks | Business wizard, page plan, generation, templates, revisions, section editor | Reviewed fixture site renders and exports with valid links |
| Publishing and leads | 1–2 weeks | Preview/live versions, subdomains, one domain workflow, forms and notifications | Publish/rollback and lead delivery pass end to end |
| SERP engine | 2 weeks | Provider integration, checks, history, scheduler, comparisons, CSV | Fixture normalization and retry/credit behavior pass |
| Commercial beta | 1–2 weeks | Billing, entitlements, usage, admin, operations, beta fixes | Signed webhook replay safe; restore exercised; beta gate met |

Expected range: 8–12 weeks with overlapping tasks; 10–14 with contingency. Sequence may change after provider spikes. Do not compress tenant isolation or billing verification to fit a date.

## Architecture proposal
Modular monolith: TypeScript web application, PostgreSQL, object storage, and separate background worker. Use a React server-rendered application with a section-schema editor; validate current framework/provider versions before installation. PostgreSQL is the durable source of truth. A durable queue handles generation, publishing, SERP tasks and email. Start with one AI adapter, one SERP adapter, one hosting adapter and one email adapter.

Published customer websites are versioned static artifacts delivered through a CDN. Public lead submissions go to a narrow authenticated-site endpoint, never directly to the control-plane database. Control plane and customer sites use separate origins. Private previews require signed, expiring access and are excluded from indexing. Production releases switch the active artifact pointer atomically; retain prior versions for rollback.

Candidate services: managed PostgreSQL/auth, S3-compatible storage, durable queue/worker, CDN/custom-hostname platform, transactional email and a payment processor available to the operating entity. Specific vendors, region, payment eligibility and prices remain undecided. Validate a custom-domain + TLS proof of concept before committing to hosting. Sites previews are design artifacts; Sites hosting is not assumed to be the final SaaS architecture.

## Launch and business model
Interview 5 agencies before scope lock; recruit 5–10 beta accounts. Validate that the research → publish → monitor loop reduces delivery time and retains weekly users. Track activation as first reviewed publication plus first completed rank check, not account creation.

Proposed packaging hypotheses: Solo, Agency and usage add-ons. Set included published sites, generated pages, AI regeneration budget, tracked keyword configurations, check frequency and retention explicitly. Avoid unlimited SERP or generation. Price only after real cost measurements and buyer interviews. Merchant-country eligibility must be established before payment integration.

Cost model: monthly contribution = collected revenue minus payment fees, AI tokens/images, SERP tasks, hosting/storage/bandwidth, email, observability and variable support. Measure per-job provider spend, reserve budget before dispatch, finalize once and release unused reservations. Example workload only: 10 sites × 20 keywords × 2 device types × 30 daily checks = 12,000 SERP tasks/month before retries; each location/language configuration multiplies usage. Dollar estimates require current provider quotes.

Success hypotheses: 70% of beta accounts publish a reviewed site within 48 hours; median hands-on setup under 30 minutes; 95% of valid jobs finish without manual recovery; positive contribution margin at intended quotas; 60% of beta agencies return weekly after four weeks. These are targets, not measured results.

## Product quality constraints
Do not invent testimonials, business addresses, licenses, prices or guarantees. Location pages require real coverage and distinct useful information; flag near duplicates. Google identifies doorway abuse and scaled content abuse as spam risks: https://developers.google.com/search/docs/essentials/spam-policies . No rank or indexing guarantees. Google's Indexing API is restricted to eligible job and livestream pages, so ordinary local service pages use sitemap/discovery and diagnostics: https://developers.google.com/search/apis/indexing-api/v3/using-api .

Proposed SERP adapter research: https://docs.dataforseo.com/v3/serp/google/organic/overview/ . Provider selection, task costs and exact local-pack support require a spike. Organic rankings, local pack rankings, map-grid results and Search Console metrics are separate datasets.
