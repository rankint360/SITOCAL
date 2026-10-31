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
