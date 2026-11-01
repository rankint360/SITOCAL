Release verification: PR #16 merged at 11bb382c1e6f26739778785a77c25ebe50e68e43. All seven hosts served 0.5.1; nine live entry checks and four asset comparisons passed. Admin menu target is active. No open PRs.

# Entry-point update — 0.5.1
2026-11-01. This update supersedes the earlier separate SERP landing/workspace URL arrangement.

- Canonical dashboard: app.sitocal.com/. Root sitocal.com/app redirects into the app entry. Anonymous dashboard visits redirect to sign-in; signup is not rendered inside the dashboard route.
- Canonical signup: app.sitocal.com/register. Signed-in users return to their requested safe workspace instead of seeing another signup form.
- Canonical sign-in: app.sitocal.com/login. login?signup=1 remains a redirect to canonical registration. Switching forms changes the URL, and headings/titles distinguish the actions.
- Canonical SERP entry: serp.sitocal.com/. Anonymous visitors see the introduction and sign-in CTA; signed-in visitors see research tools. /serp and /serp-home redirect here with queries retained.
- Editor/converter and secondary workspace links use canonical subdomains through the shared server/client URL helper.
- Admin Dashboard is linked from public Resources, authentication pages, and the workspace menu after Account & sign-in (desktop/mobile). Separate admin authentication and role checks still apply; showing a link never grants access.
- API/MCP and Google Indexer keep their existing public/private state-aware behavior.
- Redirect return destinations remain allowlisted. Registration APIs remain separate from login APIs; no accounts are merged or removed.

94 tests passed, including new production-host redirect and navigation tests. Browser checked the account/SERP flow with disposable local fixtures. The admin hostname is now DNS-active; live OAuth methods still report Google/GitHub/LinkedIn as unconfigured. Provider credentials are not fabricated or activated by this routing release.

# Page and navigation consolidation — 0.4.1
2026-10-31. Approved Emerald Studio design retained.

| Previous overlap | Canonical destination | Resolution |
|---|---|---|
| API/MCP introduction + Developer workspace | /api-mcp | One entry path. Public explanation when signed out; existing scoped-key/MCP workspace when signed in. /developer permanently redirects. |
| Google Indexer introduction + Indexing workspace | /google-indexer | One entry path. Public explanation when signed out; existing inspection/sitemap/batch/CSV workspace when signed in. /indexing permanently redirects. |
| Sign in + /sign-in | /login | /sign-in permanently redirects. |
| Create account + /create-account | /register | /create-account permanently redirects. Existing /login?signup=1 remains a compatible signup view used by older CTAs. |
| Dashboard + Overview | /app (app subdomain root also serves Overview) | /dashboard permanently redirects. |
| Pricing + Billing | Public /pricing; signed-in /billing | Different responsibilities retained: public comparison and private subscription/payment management. Workspace label is Pricing, followed immediately by Integrations. |
| SERP introduction + SERP workspace + SERPUM | SERP landing, /serp and /serpum | Different functions retained: introduction, authenticated provider-backed research, public Google-location helper. |
| Features / products / niche pages | Existing distinct pages | Overview, catalog and niche-specific guidance retained; no duplicate workspace actions created. |
| Account & sign-in vs login | /account vs /login | Existing account security/identity management retained separately from authentication. |

Public header exposes Integrations immediately after Pricing only after session verification. Desktop sidebar and mobile workspace navigation share the same Pricing -> Integrations order. API & MCP and Google Indexer labels are consistent in workspace navigation. Existing links use canonical paths, with query-preserving same-origin redirects for the five old aliases above.

Anonymous tool action CTAs go through login with the canonical returnTo path. Email and social login allow canonical tool destinations and Integrations; arbitrary return URLs remain rejected. Signed-in tool entry documents are no-store and noindex, and do not server-render the public introduction before opening the workspace. All underlying REST/MCP/indexing API routes, scopes, provider configurations and persistent data stay intact.

Validation: syntax checks; all 84 tests pass. New route tests exercise redirects/query retention, canonical links, desktop/mobile shared ordering, public introductions vs private shells, safe sign-in returns, new JS module serving and preserved authenticated API endpoints. Browser verified anonymous API/MCP -> login -> same canonical working tool, Google Indexer controls and Pricing -> Integrations in sidebar, and the signed-in public header link. No live provider actions or user data changes.
