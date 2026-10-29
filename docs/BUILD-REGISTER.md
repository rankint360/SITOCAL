# Build register
Updated: 2026-10-27 (Asia/Karachi), session 016.
Overall stage: Render test alpha deployed; user-reported health passes. Application smoke tests and production readiness pending.

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


015 / 2026-10-27: First Render deployment failed at Docker COPY because server.mjs was omitted from the packaging allowlist and therefore the GitHub upload. Earlier 33-file verification checked the incomplete manifest, not runtime completeness. Restored server.mjs to GitHub; fixed packaging with shared source selection and required runtime/Docker COPY input validation; added two regression tests. npm run check and all 20 tests pass; clean archive now contains 36 files. Docker unavailable locally, so actual container build and live health remain pending. User reports REGISTRATION_CODE and ENCRYPTION_KEY generated in Render; no secrets inspected. Next: Render Manual Deploy > Deploy latest commit, verify new main revision and /api/health, then test registration and core workflow before DNS cutover. Keep existing disk and environment settings. No DNS changes made.



016 / 2026-10-27: User reports deployment is running at https://rankleum.onrender.com/ and /api/health returns {status:ok,version:0.1.1,mode:development-alpha}. This verifies reported server health only; registration, project creation, editing/export, persistent disk/restart and external integrations remain unverified on Render. Next: user creates private test account at /app?signup=1 with REGISTRATION_CODE as invite code, then creates one template website. Retain Orchard design; an unrelated UI preview event is not treated as design approval. No source changes or repeat code tests required for this documentation checkpoint. No DNS cutover yet.



017 / 2026-10-28: User confirmed live Render account creation and template site generation. Generated content is too basic: 3-4 short pages; richer design and substantial factual page content remain required. User also confirmed editor works, revision saves, refreshed saved copy persists, and ZIP export works. These are user-reported live passes; exported ZIP rendering, WordPress imports, persistence across a Render restart and external integrations remain unverified. Next: verify Render disk mounted at /app/data and account/project persistence after service restart, then improve generator depth and visual quality. No code changes this session; previous 20 passing tests unchanged. No DNS changes confirmed.



018 / 2026-10-28: User confirmed a disk is listed in Render, restarted the service, and revisited the app: existing website revisions/edits remain. User-reported persistence across service restart passes. Exact disk mount path was not independently inspected. Live checkpoints now passed by user: health, account creation, template generation, editor, revision/save/refresh, ZIP export, restart persistence. Thin generated page content and visual quality remain open. Next deployment checkpoint: Cloudflare zone activation/delegation for ppc.pm, then attach five custom domains to existing Render service and configure shared domain settings; no DNS changes confirmed yet. External provider integrations and WordPress import validation remain pending. No code changes or repeat code tests this session.


019 / 2026-10-28: Naming reopened by user; VOOMARK and SITOCAL shortlisted, final decision pending. User reports ppc.pm and www.ppc.pm live after custom-domain host configuration. Four application subdomains/shared sign-in remain pending. No code rename or provider changes performed. Next: evaluate fresh non-Rank brand names; domain availability/trademark checks still pending. See docs/BRAND-DECISION.md.


020 / 2026-10-28: Expanded public-source brand screening saved in BRAND-SCREENING-SITOCAL-VOOMARK.md. VOOMARK now paused as recommendation pending review of PTC VuMark phonetic/software proximity; SITOCAL retained conditionally with Sitocal Gold and SiteLocal findings. No legal clearance, verified domain availability, purchase or implementation rename. Official registry searches remain incomplete. Both remain user-shortlisted unless user changes preference.


021 / 2026-10-29: Pakistan-first SITOCAL screening updated in BRAND-SCREENING-SITOCAL-VOOMARK.md. No obvious indexed Pakistan software-business match; IPO timeouts and WIPO challenge prevented official trademark search. Domain status still unverified. SITOCAL retained conditionally; official exact/similarity screening and registrar verification pending. No code changes, purchases, filings or rebrand.


022 / 2026-10-29: Screened user-proposed Localett, Localitt, Sittus, SitLite, Webizor, Lokelli, Lokaboo, Bildexa, Locazor, Localifier, Loxall. Domains available per user, not independently verified. Best new candidates for further screening: Lokelli (brand sound but C/K/double-L spelling friction), Locazor (strong but loc-a-zor vs locator/locasor spelling), Bildexa (builder association but Bild/Build ambiguity; Swedish automotive company listings). Sitocal remains strongest product fit, no final rename. Relevant uses: Sittus construction software https://sittus.com.br/ ; Lokaboo near-identical sound to Locaboo software https://www.locaboo.com/ ; SitLite resembles SiteLite website service https://www.sitelite.it/ and SaaS https://www.sitelite.com/ ; Webizor digital-agency directory/professional listings, primary identity not verified; Loxall secondary US class24 trademark record serial90215088 and other uses, not a proven SaaS conflict. No obvious relevant indexed exact match surfaced for Localitt, Lokelli or Localifier; this is not clearance. Localett mostly unrelated email occurrence, Locazor personal handle occurrence: do not characterize these as software business conflicts. No official trademark searches for the 11 completed; no purchases/rebrand/code changes.

023 / 2026-10-29: User finalized SITOCAL and confirmed sitocal.com purchased; IPO search no related marks per user. Rebranded visible landing/app/editor/converter/provider/export wording and lettermark to Sitocal, production examples to sitocal.com. Preserved internal database/session/import/editor identifiers and source/repository names for compatibility. Syntax checks and 20 tests pass. Orchard retained. No DNS/env changes; next add and verify sitocal.com plus www/app/editor/wp/serp on existing Render service, then coordinated BASE_DOMAIN/PUBLIC_ORIGIN/COOKIE_DOMAIN cutover. Basic generated content improvement remains pending. GitHub sync prepared in this session.


024 / 2026-10-29: New sole source repository https://github.com/rankint360/SITOCAL explicitly selected; user forbids old repository use/writes. Inspected public main commit ff90db595d18c4dd56dc2b35a64dc60b51dda378: 36 files all hash-match local tested source; only absent local document is optional naming screening report. Required Docker/runtime/config/tests present. npm run check and all 20 tests passed again against hash-identical local code. Current GitHub connection read-only (push:false). No remote writes performed. No CI workflow present; container build not performed locally. Render source-repository switch and live deployment from new repo not verified. Old internal rankleem package/database/manifest identifiers intentional for compatibility. Local destination policy/status/register updated; remote docs still contain historical destination until write access is connected. Next: connect rankint360 GitHub account/app repository access for future writes; verify Render uses rankint360/SITOCAL main while preserving disk/key/env.


025 / 2026-10-29: GitHub reconnection now verified for rankint360/SITOCAL: push/admin true. Successfully synced AGENTS.md in commit 315194306cd5b63cc56c6bee8d22adea17122b89. Prior 403 access blocker resolved. Only new repository used; old repository untouched. No runtime code changes or new tests required. Render source switch/domain cutover still unverified.


026 / 2026-10-29: User moved deployment to a new Render account/service at https://sitocal.onrender.com/. Exact /api/health returns status ok, version0.1.1, development-alpha per user; earlier double-slash request caused Page not found. User confirmed disk after instruction to verify /app/data. User now confirms account creation, site generation, editor save and edits remaining after browser refresh. These are user-reported live passes on NEW service, distinct from older deployment. Service restart persistence and ZIP export on new service remain pending; old service data migration not confirmed. Next: restart new Render service and confirm account/project/revision still exist, then ZIP export and sitocal.com domain cutover. New sole GitHub repo remains rankint360/SITOCAL; no code or remote changes this session.


027 / 2026-10-29: On new Sitocal Render service, user restarted twice: first request returned 502, second restart/access succeeded. User logged in, confirmed saved edits remained, exported ZIP and opened exported index successfully. User-reported restart persistence, ZIP export and exported index rendering now pass. Initial 502 cause unknown; no log evidence reviewed, do not label resolved root cause. Next: connect sitocal.com and six root/www/app/editor/wp/serp hostnames to same new Render service, verify TLS then coordinated BASE_DOMAIN/PUBLIC_ORIGIN/COOKIE_DOMAIN cutover. Current domain DNS state not confirmed. External integrations and richer generation remain pending. No source or remote changes this checkpoint.


028 / 2026-10-29: User completed sitocal.com Cloudflare activation via Spaceship nameserver change; added root/www and app/editor/wp/serp to new Render service, verified domains and DNS. Root opens per user. Following coordinated environment instructions (BASE_DOMAIN=sitocal.com, PUBLIC_ORIGIN=https://app.sitocal.com, COOKIE_DOMAIN=sitocal.com), user confirms login on subdomains and saved sites available. User-reported domain cutover/shared login/site access pass. Root https://sitocal.com ; builder https://app.sitocal.com ; editor https://editor.sitocal.com ; converter https://wp.sitocal.com ; research https://serp.sitocal.com . Current alpha remains version0.1.1; no production-readiness claim. External integrations remain unverified live. Next: close public signups after intended test accounts exist (ALLOW_SIGNUPS=false), then improve thin generated content/layout and staged provider tests. No runtime code changes or repeat tests this documentation checkpoint. Only rankint360/SITOCAL authorized repository; old destination forbidden.


029 / 2026-10-29: User confirms signup restriction done and requests rigorous full-platform development. Began milestone1 v0.1.2: full Home/About/Services/Contact plus up to8 service pages, 4-6 sections/page, optional factual business brief, responsive hero/service cards/nav/footer, legacy editor/ZIP compatibility, deterministic collision-free service slugs. Updated AI section plan/prompt and output budget; truncation still rejected, no live AI request. New renderer module lib/website.mjs and four regression tests (24 total pass). Preview outputs/sitocal-generation-preview/index.html. Browser runtime failed to initialize (kernel asset path error); visual/mobile browser QA pending, no claim of stunning output verified. No image/asset pipeline yet, template text remains generic where facts not supplied. Full DEVELOPMENT-ROADMAP.md adds staged acceptance gates. Existing stored content not regenerated. 0.1.2 requires live review after deployment; no DB/key/schema migration. Only rankint360/SITOCAL used for source publishing.

