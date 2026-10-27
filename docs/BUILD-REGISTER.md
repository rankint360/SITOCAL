# Build register
Updated: 2026-10-27 (Asia/Karachi), session 009.
Overall stage: Working local Rankleem alpha. Public production deployment: not started.

| Work ID | Item | Status | Evidence / next action |
|---|---|---|---|
| BR-001 | Reference review | Partial | RankLocal public page reviewed; other two sites inaccessible |
| BR-002 | Development plan | Draft complete | PRODUCT-PLAN.md; user review pending |
| BR-003 | Comprehensive MVP definition | Draft complete | MVP-SPEC.md; scope approval pending |
| BR-004 | UI direction and refinement | Refined Orchard approved | orchard-refined.html; original five retained |
| BR-005 | Design system | Orchard approved direction | Forest/ivory/leaf palette; DESIGN-SYSTEMS.md |
| BR-006 | Naming | Approved: Rankleem | BRAND-DECISION.md; domain ownership/availability unverified |
| BR-007 | Architecture/provider spikes | Alpha implemented; live spikes pending | Node 24/SQLite/browser JS; Render recommended; see IMPLEMENTATION-REGISTER.md |
| BR-008 | Auth, tenant model, migrations | Local accounts/isolation tested | Organizations, verified identity/recovery and production DB pending |
| BR-009 | Builder, editor, generation | Working local alpha | Template workflow, optional AI adapter, revisions; full assets/SEO pending |
| BR-010 | Publishing, domains, leads | Publishing/registrar adapters; live checks pending | Leads/custom-domain lifecycle pending |
| BR-011 | SERP engine | UI, adapters and Google OAuth code | Live validation, scheduling and property binding pending |
| BR-012 | Billing, admin, operations | Activity log implemented; rest pending | Billing, durable jobs, hard spending budgets and admin pending |
| BR-013 | Security and beta verification | 16 tests pass + browser core QA | Public security/load, restore and live provider gates pending |
| BR-014 | Production deployment | Not started | After beta and release approval |
| BR-015 | Marketing launch | Planned | Interviews, beta cohort, then evidence-based positioning |

## Session log
001 / 2026-10-27: Prepared plan, MVP specification, five local UI concepts and design tokens. Recorded reference-access limitations and implementation sequence. No services provisioned, payment accounts connected, product name selected or production software deployed.

## Update protocol
At the end of every working session in this chat, update this register and ../STATUS.md: completed changes, evidence, verification actually run, failures, blockers, decisions, next executable step and relevant file paths. Append a session log; never overwrite prior history. Proposed work must not be labeled implemented. This protocol runs during active work only; no background automation is configured.

002 / 2026-10-27: User explicitly selected Orchard and requested a more attractive refinement before proceeding. Created orchard-refined.html with forest hero, ivory surfaces, leaf accents, serif display typography, styled site miniatures, filters, local project details and responsive navigation. JavaScript syntax and unique IDs checked; no browser visual QA performed. Naming and production implementation remain pending.

003 / 2026-10-27: User approved refined Orchard. Prepared three naming candidates with preliminary exact-name web screening and observed collisions. Recommended LocalCanopy; no name selected or availability confirmed. Production build remains not started.


004 / 2026-10-27: User requested a more striking, brandable name. Screened a broader invented-name pool and created BRAND-NAMES-ROUND-2.md. Current finalists: Vistaryo (recommended), Rallygrove, Veylantic. Exact-name web screening only; domains/trademarks unchecked. No name selected. Orchard remains approved; production implementation not started.


005 / 2026-10-27: Screened six user-proposed names. RankMortar recommended; Rankleem runner-up. Flagged same-category Ryte overlap and similar local-ranking brands. Exact searches found no obvious indexed exact uses; HTTPS/RDAP access failed for all six domains, so registration availability remains unknown. Saved NAME-SCREENING.md. No name selected or purchased.


006 / 2026-10-27: Researched challengers to RankMortar. RankBrio recommended as strongest challenger for spoken energy; RankBastion/RankTrellis alternatives. Discarded existing same-category brands including RankVolt and RankAnvil. Saved NAME-CHALLENGERS.md. Availability unverified; no name approved.


007 / 2026-10-27: Recorded user rejection of RankBrio due to RankBrew resemblance. Screened new exact/spaced and category queries; produced FRESH-NAME-SHORTLIST.md. MapMason strongest fresh direction; RankRampart, RankHearth and TownAnvil alternatives. No name approved; domain/trademark status unknown. Orchard still approved; app not started.


008 / 2026-10-27: User explicitly selected Rankleem and clarified that one-letter brand differences alone need not disqualify a name. Saved BRAND-DECISION.md and applied Rankleem to the approved Orchard preview. Naming complete; no logo/domain purchase or live application. Next: implementation preparation and architecture/provider spikes.


009 / 2026-10-27: Built outputs/rankleem runnable Node24/SQLite alpha: branded landing, builder, click editor/revisions, ZIP/import, Elementor/Gutenberg/WXR/Divi4 beta, optional AI adapter, source/deploy adapters, registrar and SERP/Google code. 16 automated tests pass; browser core journey/mobile converter QA done; screenshots saved. Docker/Render/five-host configs prepared. User confirms rankleem.com ownership; recommends one Render service/account + Cloudflare DNS; not yet provisioned. Read IMPLEMENTATION-REGISTER.md for gaps. No live credentials, API calls, DNS or hosting changes. Native Divi5 and production SaaS gates pending.


010 / 2026-10-27: Verified Render hosting costs/limits for current alpha. Persistent SQLite requires paid web compute plus persistent disk; free services cannot attach disks and lose local filesystem changes. Current starting compute USD7/month and disk USD0.25/GB/month; domain/usage charges additional. A paid workspace upgrade is separate from compute. No purchase/deployment authorized or made. Sources: https://render.com/docs/free and https://render.com/pricing .


011 / 2026-10-27: Researched free testing alternatives. Railway currently offers USD5 trial credits up to 30 days, then USD1 monthly credit and 0.5GB volume on Free; ongoing full-app hosting is not guaranteed within credits and unverified trials restrict outbound network. Local Node + Cloudflare Tunnel is a zero-hosting-fee testing path while PC stays on. Oracle Always Free VM is another option, subject to capacity/reclamation and server management. Cloudflare Workers+D1 needs a backend port, not drop-in. Hugging Face Docker Spaces now require paid account eligibility and were not recommended as a free option. No alternative selected or deployed; Render recommendation remains available. Sources: https://railway.com/pricing , https://docs.railway.com/pricing/free-trial , https://developers.cloudflare.com/tunnel/ .


012 / 2026-10-27: Evaluated DigitalOcean. Droplet VM is compatible with current Node/SQLite architecture and can serve all five hostnames behind Caddy/Cloudflare DNS. Current Basic pricing: 1GiB USD6/month; 2GiB USD12/month; backup/API costs extra. App Platform has ephemeral local files and no persistent volumes, so unchanged SQLite backend is unsuitable there. Droplet needs OS updates, firewall/TLS, process management and backup operations. No provider selected or resources created. Sources: https://www.digitalocean.com/pricing/droplets and https://docs.digitalocean.com/products/app-platform/how-to/store-data/ .


013 / 2026-10-27: User selected Render for testing, dummy domain ppc.pm at Hostinger, Cloudflare DNS; GitHub/Render/Cloudflare accounts ready. Prepared guided deployment without creating resources or changing DNS. Updated source to 0.1.1: BASE_DOMAIN/host allowlist/meta-based UI links, HTTPS Render hostname fallback, optional registration invite code, configurable blueprint, Node24 Docker tag. Added config tests and API invite/host tests; npm run check and all 18 tests pass. Local Docker executable unavailable, so container build remains unverified. Created deploy/PPC-PM-TEST.md. Current checkpoint: upload refreshed clean source to a private GitHub repository; repository URL pending. Next: one paid Render web service/disk, temporary onrender smoke test, Cloudflare delegation and five dummy hostnames, then staged function tests. No secrets or external API calls used.

014 / 2026-10-27: User explicitly requested upload to https://github.com/anjam775/Rankleum . Repository inspected: empty, public, default branch main, connected account has push access. Uploaded 33 source/documentation files with Dockerfile/package.json at repository root; remote recursive tree and Git blob SHA-1 hashes match all local package files. No data/, .env or encryption key uploaded. Product remains Rankleem despite repository spelling. Existing 18 passing tests remain applicable; code unchanged this session. Next: user connects this repository to a paid Render Docker web service with 1GB persistent disk and follows deploy/PPC-PM-TEST.md. No hosting resource, paid plan, provider credentials or DNS changes made. Updated handoff records and source archive after upload.
