# Sitocal

Private development alpha, version 0.3.0. Approved brand: Sitocal. Design: Emerald Studio — white surfaces, emerald actions, Manrope headings and Inter interface. See docs/SITOCAL-EMERALD-DESIGN.md. Existing Render deployment serves sitocal.com and app/editor/wp/serp subdomains; see STATUS.md for the latest verified release.

## Run

Requires Node.js 24 or later with built-in SQLite. No npm packages to install.

```powershell
Copy-Item .env.example .env
npm start
```

Open http://localhost:4317 . Create your own local account with a password of at least 12 characters. The browser QA account is disposable test data in the original workspace, not part of the source ZIP. A clean copy starts with no accounts/projects. Local account recovery and email verification are not implemented.

```powershell
npm run check
npm test
```

## Interfaces

| Public hostname after deployment | Local path | Purpose |
|---|---|---|
| sitocal.com | / | Public landing page |
| app.sitocal.com | /app | Account and website workspace |
| editor.sitocal.com | /editor | Click-to-edit site text, page SEO, sections and revisions |
| wp.sitocal.com | /wp | Elementor, WordPress/Gutenberg, Divi 4 content exports |
| serp.sitocal.com | /serp | Rankings, competitors, demand, traffic estimates, backlink summaries and GSC/GA4 |

Auxiliary routes: /integrations, /publish, /domains and /jobs. Production links preserve selected project IDs and use the requested subdomains. A single web service can answer all five hostnames; five service accounts or five servers are not required. See deploy/DEPLOYMENT.md.

## Implemented and verified locally

- Persistent multi-account sign-in, salted scrypt password hashes, hashed sessions, per-account project ownership, same-origin/CSRF checks, host allowlist and request limits.
- Three static styles; homepage + service pages + contact page from real business inputs. Offline template drafts work with no API. Optional OpenAI structured-output generation uses the account's own key/model, records usage, validates output and never auto-publishes.
- Page selection, click text to inspect/edit, unsaved preview, section add/remove/reorder, title/description, saved revisions and restore. Isolated iframe preview; output text is escaped.
- Static ZIP download with HTML and a sitocal.json manifest; Sitocal ZIP reimport; other HTML ZIPs map headings/body text into a new layout. Original arbitrary CSS, media, JavaScript and exact layout are not retained.
- Native Elementor heading/text/button widgets, Gutenberg block source plus WordPress WXR draft pages, Divi 4 shortcode/WXR beta. Import instructions included in every conversion ZIP. No claim of pixel-perfect conversion or actual WordPress installation verification.
- Server-encrypted integration credentials. Credentials never round-trip to the browser. Provider activity records distinguish committed/submitted/triggered/unknown/partial results.

## Live integrations implemented as adapters, not live-verified

Configure in Integrations using your own accounts. These create external effects or use paid credits only when you invoke them. No credentials or paid calls were used during development.

| Integration | Configuration | Supported action / limit |
|---|---|---|
| GitHub | Fine-grained token with repository Contents write, owner/repo, existing branch | Atomic tree/commit/non-force branch update; initialized repository required |
| GitLab.com | Token with API/repository write, namespace/project, existing branch | Batch commit; initial adapter inspects up to 100 root entries; deeply populated/nested repositories require expansion |
| Bitbucket Cloud | Account email, scoped API token, workspace/repo, branch | Multipart source commit |
| Netlify | Personal access token, existing site ID | ZIP deployment submission; response is not proof of a completed live deploy |
| Vercel | API token, project name, optional team ID | Static file deployment submission; no polling yet |
| Cloudflare Pages | Secret deploy-hook URL | Triggers an existing Git-linked project. Repository and branch must match source push. No direct upload adapter yet |
| Render | API token, existing srv- service ID | Triggers existing repository-linked build. Repository/branch must match source push |
| DataForSEO | API login/password | Top-100 organic SERP, same-snapshot target/competitors, Google Ads demand estimates, modeled domain traffic and backlink summary. Separate product billing/access can apply |
| Cloudflare Registrar | Account ID and appropriately scoped token/API access | Availability search with provider response; no automatic purchase |
| OpenAI | API key and model ID available to your account with Structured Outputs | Draft generation from the approved schema; no hardcoded latest model |

Provider calls time out after 45 seconds and are not automatically retried if external outcomes are ambiguous. In-flight jobs become unknown after restart; inspect provider before retrying. One active provider action/account and a default daily count limit of 50; this is **not a dollar budget or credit ledger**. Stable client idempotency and durable queued workers remain release work.

## Google connection

1. Create a Google Cloud OAuth web client and enable Search Console API, Analytics Admin API and Analytics Data API.
2. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in server secrets. Local callback: http://localhost:4317/api/google/callback . Production callback: https://app.sitocal.com/api/google/callback . Register exact URI with Google.
3. Configure consent/test users as appropriate; public access may need Google verification.
4. Connect in the SERP Google tab, grant read-only scopes, then load accessible properties. GSC query reports have a three-day delay and cover 28 days; GA4 reports cover 28 days through yesterday.

OAuth uses one-time session-bound state, PKCE, encrypted access/refresh tokens and server-side refresh. Disconnecting removes local tokens; it does not yet call Google's token revocation endpoint. Google UI property data is not automatically inserted as analytics tracking into exported websites. GA4 event/tag installation and persistent project-property binding remain pending.

## Persistence and deployment constraints

`data/` holds SQLite, WAL files, and the local encryption key. Never commit or share it. Do not copy a live SQLite file without a consistent backup mechanism. Preserve the encryption key with backups or saved provider credentials cannot be decrypted. Production should set a stable ENCRYPTION_KEY via secrets rather than relying on local key generation. Filesystem permissions on Windows must also be managed by the host owner.

The included Dockerfile and Render blueprint target a single persistent service. They are prepared but not deployed or Docker-build verified. The current SQLite server cannot be copied unchanged into Vercel/Netlify Functions. For public SaaS scale, migrate persistence to managed PostgreSQL, use object storage and durable workers; add verified email/recovery, organization roles, billing, usage reservations and full release gates.

## Current limits / next engineering work

- Development alpha; no public-launch approval or deployment.
- Single-owner accounts, not organization teams/RBAC. No email verification/recovery, billing or lead inbox/form endpoint yet.
- No durable queue/schedules/cancellation, deployment completion polling/rollback, provider OAuth for Git/hosting, or hard dollar spend reservations.
- No image editing/upload asset pipeline; no arbitrary HTML/CSS visual-fidelity preservation.
- Divi 5 native layout export, Elementor full-site kits, other page builders and WordPress real-install QA pending.
- No live provider or Google end-to-end validation; fixture tests are not external integration certification.
- Sitemap/canonical/schema/custom-domain management for generated customer websites, analytics tag insertion and URL redirect management pending.

Read STATUS.md and docs/BUILD-REGISTER.md to continue. Sixteen automated tests passed at session 009; browser QA covered registration, template draft creation, click editing, preview/apply/save, persisted reload, converter layout and mobile overflow. Live external APIs were not called.

## Version 0.1.1 — dummy-domain deployment
BASE_DOMAIN now controls public-domain links and allowed root/subdomains; use ppc.pm for the selected dummy domain. Leave BASE_DOMAIN and COOKIE_DOMAIN unset during the initial onrender.com smoke test. Optional REGISTRATION_CODE restricts test signup. All 18 tests pass after this update; Docker build and live deployment remain unverified. Follow deploy/PPC-PM-TEST.md checkpoint by checkpoint.

## Sitocal rebrand checkpoint (2026-10-29)
Final brand Sitocal, sitocal.com purchased per user. Preserve sitocal.sqlite, session and ZIP manifest identifiers for compatibility with existing projects. Existing Render service/repository remain unchanged. Live domain cutover is pending; see docs/BRAND-DECISION.md for exact values and order.


## Version 0.1.2 — fuller website generation
New drafts include Home, About, Services, Contact and up to eight service pages (4-6 sections each), an optional business brief and updated responsive rendering. Existing saved content and sitocal.json imports remain compatible; content is never automatically regenerated. Preview QA pending because browser automation was unavailable. See docs/DEVELOPMENT-ROADMAP.md for full-platform milestones. AI uses a larger output allowance and may cost more; no live AI validation performed.


## Version0.1.3 — approved Fieldwork UI
Approved logo/header/footer/favicon assets and responsive shared design across root and app/editor/wp/serp plus supporting screens. Overview uses actual site/page/credential counts with explicit search-data empty state. Static previews: run node scripts/ui-preview.mjs.26 tests pass; actual browser visual/mobile QA remains pending because browser runtime failed to initialize. Review PR1 contains this work plus fuller generation; live site is unchanged until merged/deployed.


## Version0.1.4 — logged-out landing flow
Reference-inspired long landing with approved Fieldwork identity, native trade previews, feature/theme/workflow/export/access/FAQ sections. No invented reviews, speed or pricing claims.27 automated tests pass; browser visual QA pending. See docs/SITOCAL-LANDING-FLOW.md. Existing review PR remains unmerged.


## Marketing and contact enquiries (0.1.6)

The public home page includes rotating product and feature previews, vendor-icon marquee, expanding theme rail, niche icons, sample review layouts, proposed five-plan pricing, FAQ search, contact form and policy pages. Vendor source URLs are recorded in docs/BRAND-ASSET-SOURCES.json. Sample reviews are fictional; launch listings are unverified; API/MCP/indexing and payment processing are not live products.

Public pages: /about, /contact, /blog, /products-services, /api-mcp, /google-indexer and the five footer policy routes. /sign-in, /create-account and /dashboard connect to the existing authentication and workspace flows. Registration settings remain unchanged.

Contact enquiries are validated and stored in the private enquiries table. No email is sent by this release. The service operator can run npm run enquiries:list on the Render service shell to review up to 100 recent messages; its output contains personal data and must not be published. The web API does not expose enquiry records. Configure email delivery and define retention before commercial launch.

Paid prices are owner-supplied; USD/month is the working assumption. Usage quotas, checkout, refund windows and full commercial/legal terms remain to be finalized. Policies identify AJ Digit, LLC (dba SITOCAL), contact@sitocal.com, and are marked launch drafts.

## Services release 0.1.7

Working API/MCP, GSC inspection/sitemap tools with persistent bulk jobs, Stripe checkout/webhook code, manual-payment request foldouts and saved-website limits are implemented. Read docs/SERVICES-SETUP.md. Stripe is disabled until merchant secrets/prices/webhook are configured; Google requires OAuth configuration and user consent. No live merchant payment or GSC property has been verified. Saved-site limits are Free 1 / Starter 5 / Growth 15 / Agency 100; existing drafts are preserved. Earlier descriptions of these tools as planned are superseded by this checkpoint.

## Social sign-in and product landing pages (0.1.9)

Email/password and Google/GitHub/LinkedIn login flows are implemented. Real social login requires OAuth application configuration in Render; see docs/SOCIAL-AUTH-SETUP.md. Account & sign-in provides explicit linking and password setup/change. Registration gates remain unchanged. Public SERP home is serp.sitocal.com; its signed-in workspace moved to /serp. The full Indexer landing remains sitocal.com/google-indexer. Public product pages include SSR content and canonical metadata.

## SERPUM local search checker

Public tool: https://serp.sitocal.com/serpum. Generates Google search links from country, language and chosen coordinates; does not scrape or certify rankings. Optional address lookup uses a cached, rate-limited Photon-compatible server endpoint. See docs/SERPUM.md for usage limits, privacy, configuration and reference analysis.
