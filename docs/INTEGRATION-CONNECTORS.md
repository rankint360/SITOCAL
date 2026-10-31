# Integration connectors — Sitocal 0.4.0
2026-10-31. Scope: all 21 entries in the signed-in Integrations catalog.

## Capability matrix
| Provider | Connection check | Usable action |
|---|---|---|
| OpenAI | Retrieve configured model | Website draft generation (Responses, structured JSON) |
| Claude AI | Retrieve configured model | Website draft generation (Messages, locally validated JSON) |
| Google Gemini | Retrieve model and generateContent capability | Website draft generation (JSON mode, locally validated) |
| Grok AI | Retrieve configured model | Website draft generation (Chat Completions JSON mode, locally validated) |
| GitHub | Read configured repository; reject explicitly absent push permission | Existing atomic commit and non-force branch update |
| GitLab | Read configured project | Existing repository commit |
| Bitbucket | Read configured repository | Existing source push |
| Cloudflare Pages | Local hook format check only; never triggers a build during a check | Existing repository-linked deploy hook from Publish |
| Vercel | Read configured project | Existing static deployment |
| Netlify | Read configured site | Existing ZIP deployment |
| Render | Read configured service | Existing repository-linked deploy trigger |
| DataForSEO | Account endpoint and task status | Existing rank, demand, traffic and backlink research |
| Cloudflare Registrar | Read configured account | Existing provisional domain availability search; this check does not prove registrar entitlement |
| Semrush | API unit balance | One-row regional domain ranks report; modeled estimates |
| Ahrefs | API limits/usage | Site Explorer domain rating; proprietary backlink metric |
| SE Ranking | Data API subscription | Regional domain overview; modeled estimates |
| Cursor | Read one cloud agent | List up to 20 cloud agents; no agent creation or repo changes |
| Google Search & Analytics | Existing OAuth/property discovery | Existing Search Console, GA4, sitemap and inspection tools |
| Google Antigravity | User-completed MCP setup | Connect existing Sitocal scoped-key MCP endpoint using provider's supported client |
| Replit | User-completed GitHub import | Push from Sitocal Publish, then import repository in Replit |
| Lovable | User-reviewed prompt handoff | Prepare encoded prompt link; opens unsent in Lovable, no file synchronization |

18 available connector cards (17 credential configurations plus Google OAuth), three guided workflow cards. Logos in the marketing tech scroller are not additional API contracts. WordPress/Elementor conversion, billing Stripe and transactional service setup remain their existing separately documented features.

## Setup
Sign in and open Integrations. Configure only your own account. AI connectors require both a server API token and a model ID accessible to that API account; consumer chat subscriptions do not substitute for API access. Saving replaces the entire provider configuration. Existing values never return to the browser. Click **Check connection** for an account/model read; its timestamp and outcome are recorded. Then use the appropriate workspace action. For AI, Create website > AI draft > provider. For Semrush/Ahrefs/SE Ranking, use the card's Domain report. Cursor offers List agents. All reports require a review checkbox and can use provider quota.

Google OAuth requires server environment setup; see SOCIAL-AUTH-SETUP.md and SERVICES-SETUP.md. Paid SEO APIs require the provider's relevant API entitlement/credits. No merchant account, Google project, paid SEO key or customer provider account was activated by this release.

## Server contracts and safety
- POST /api/connectors/:provider/verify: signed-in session, same-origin/CSRF enforced, 12 connector requests/minute/account. Fixed provider URLs; no paid generation/build.
- POST /api/connectors/:provider/execute: same protections and existing bounded job runner. Allowlisted domain-overview (Semrush/Ahrefs/SE Ranking) or agents (Cursor). reviewed:true required.
- GET /api/connections returns saved provider IDs and sanitized check metadata only.
- Extra-provider credentials validated before storage; existing AES-256-GCM encryption and persistent ENCRYPTION_KEY retained.
- Additive connector_checks table. Replacing/removing configuration clears checks. An in-flight old credential check cannot verify a replacement configuration.
- No automatic provider retries. Generic failures exclude raw provider responses/keys. Fixed HTTPS hosts, redirect rejection, 45-second timeout, 2 MiB response limit in new transport.
- Read access verified is deliberately narrower than write authorization or successful publish. Cloudflare Pages hook checks say format-valid, never verified.
- AI outputs must preserve all requested page slugs/order/count and section counts; incomplete/refused/invalid output cannot save a draft.
- New API connector actions do not expand API-key/MCP scopes or expose paid generation via external MCP.

## Validation and remaining limits
81 automated tests pass (11 additional tests): all direct verification adapters, review/input guards, provider failure honesty, bounded transport, three additional AI generators and incomplete-output rejection, authenticated HTTP account isolation, CSRF, missing connection, credential replacement/removal and verification resets. Existing publish, Google, export, migration, packaging and UI suites retained.
Browser checked local disposable account integration directory, all 21 entries, search filtering, Claude configuration dialog, Lovable encoded prompt handoff. No live provider key was used; provider responses are fixtures. Per-account live access must be tested after the account owner configures credentials.
Checks are historical snapshots; provider permissions or credits can change later. Cursor connector is read-only. Guided workflows are not unattended hosted APIs. Semrush CSV adapter is scoped to the selected one-row numeric domain report; no general CSV import/export parser. No webhook-driven quota/billing reconciliation or multi-destination connection profiles.

## Official references checked
- OpenAI model access: https://developers.openai.com/api/reference/resources/models/methods/retrieve
- Anthropic Messages/models: https://platform.claude.com/docs/en/api/messages
- Gemini generateContent: https://ai.google.dev/api/generate-content
- xAI Chat Completions: https://docs.x.ai/developers/model-capabilities/legacy/chat-completions
- Semrush API balance: https://developer.semrush.com/api/v3/get-started/api-units-balance/
- Semrush domain reports: https://developer.semrush.com/api/v3/analytics/domain-reports/
- Ahrefs limits: https://docs.ahrefs.com/en/api/reference/subscription-info/get-limits-and-usage
- SE Ranking: https://seranking.com/api/data/getting-started/ and https://seranking.com/api/data/domain-analysis/
- Cursor: https://prod.cursor.com/docs/cloud-agent/api/endpoints
- Antigravity MCP: https://antigravity.google/docs/mcp
- Replit import: https://docs.replit.com/build/import-from-providers
- Lovable reviewed prompt URLs: https://docs.lovable.dev/integrations/build-with-url
