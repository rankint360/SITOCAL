# Sitocal implementation register — session 009

Date: 2026-10-27 (Asia/Karachi). Source: outputs/sitocal/ . Runnable local alpha, not public production.

## Scope change accepted

The user moved WordPress conversion, Google reporting, multiple repository/hosting providers and domain registrar search into the current build scope. Earlier MVP documents deferred several of these; the latest request supersedes those deferrals. User confirms ownership of sitocal.com. Recommending Render + Cloudflare does not mean hosting or DNS has been configured.

| Requirement | Implemented locally | Not yet complete |
|---|---|---|
| sitocal.com | Responsive branded landing, real navigation, FAQ, signup path | Actual DNS/TLS/public deployment, production content/legal pages |
| app.sitocal.com | Accounts, template generator, three styles, project persistence, optional structured-output AI adapter | Organization roles, billing, identity verification/recovery, durable AI queue, live AI validation |
| editor.sitocal.com | Click-to-edit heading/body/CTA; page selector; SEO text; section add/remove/reorder; revisions/restore; ZIP export | Arbitrary HTML visual fidelity, images/assets, freeform layout/style controls |
| wp.sitocal.com | Manifest ZIP import; arbitrary HTML text mapping; Elementor native page JSON; Gutenberg blocks + WordPress WXR; Divi 4 shortcode/WXR beta | Real WordPress/Elementor/Divi import validation; Divi 5 native layouts; other builders; full-site kits/media |
| serp.sitocal.com | Rank/competitor adapter with history; demand/traffic/backlink adapters; Google OAuth PKCE/state, properties, GSC/GA4 reports | Live API validation; scheduled jobs; project-property binding; analytics tag installation; charts/CSV/retention refinements |
| Source publishing | GitHub, GitLab.com, Bitbucket Cloud adapters; shared configured publish action | Live verification; provider OAuth; auto-create repositories; GitLab listing pagination for >100 root entries |
| Deploy generated websites | Netlify ZIP, Vercel file submission, Cloudflare Pages Git hook, Render Git-linked trigger | Completion polling/rollback; Cloudflare direct upload; multiple saved destinations/project; branch linkage verification |
| Registrar search | Cloudflare Registrar availability-check adapter + UI | Live account/API-access validation; more registrar adapters; no purchase functionality requested/implemented |
| Platform deployment | Dockerfile, Render blueprint, five-host routing, Caddy alternative, environment example | Actual hosting resources, DNS verification, production keys and release gates |

## Verification evidence

16 automated tests pass: API end-to-end account/project isolation, CSRF, generation/editor/revision/import/export/conversion paths, ZIP integrity/path limits, output escaping, native Elementor schema, Gutenberg/Divi content structure, AI rejection/parsing, SERP semantics, credential encryption and password hashing, and mocked provider payloads. Tests do not authenticate to external services.

Browser QA: landing navigation, disposable local signup, business form → four-page draft → iframe text selection → edit/apply preview → save → persisted reload; corrected dirty/save-state feedback. Converter mobile layout checked at 390px with no horizontal overflow. Desktop captures saved as sitocal-landing-preview.png, sitocal-workspace-preview.png and sitocal-editor-preview.png. Responsive viewport override reset after checking.

Not verified: live provider APIs, OAuth consent/token exchange, real WordPress installs, Docker build, Render service, Cloudflare records, backups/restore, payment flows or production security/load gates.

## Architecture deviation

Implemented a dependency-free Node.js 24 ESM + browser JavaScript + SQLite vertical slice instead of the proposed TypeScript/React/Postgres stack. This makes the local workflow runnable immediately with no dependency installation. It is a deliberate alpha implementation, not evidence that the originally proposed production stack was completed. Public scale requires managed persistence, background workers, identity and billing hardening.

## Next actions

1. Review actual UI and validate customer-site/converter output.
2. Confirm Render workspace/repository and paid plan/disk choice; user owns domain.
3. Establish API/OAuth credentials through secret settings; verify each integration with a small controlled action and record provider outcome.
4. Complete WordPress/Divi version QA and remaining private-alpha release gates.
5. Deploy gated alpha to Render; attach five custom domains using Cloudflare DNS and verify TLS/session flow.
6. Complete production gaps before public paid launch. Do not treat this register as all-feature production completion.
