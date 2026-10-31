# SITOCAL Emerald Studio design system
Approved and implemented 31 October 2026. Supersedes Fieldwork as the platform UI direction; approved SITOCAL logos and generated website themes remain in use.

## Shared tokens
Light: primary #0B7659, ink #142923, white #FFFFFF, background #F5F8F6, tint #DFF3E8, border #DCE6DF. Dark: background #102019, panels #182C23, ink #E7F2EB, muted #AFC4B7, green highlights. Actual text/control contrast and focus state must remain visible when extending.

Headings use Manrope, interface and body use Inter. Latin variable WOFF2 fonts are bundled as data URLs in separate local font CSS, with SIL OFL copyright/license texts in docs/FONT-LICENSE-*.txt. No font-provider request occurs at runtime. Other scripts use fallback fonts. Content-Security-Policy adds data: to font-src only; connect-src, scripts, frames and account security are unchanged. CSS is public/emerald.css, loaded after legacy page styles.

## Layout
Public header: Product, Solutions, Resources, Pricing; sign-in/start CTA and theme toggle. All eight tool destinations, 30 niches, comparison/about/blog/contact and guides remain accessible. Native details menus retain keyboard operation; existing Escape/outside-click handling applies.

Homepage: concrete hero, product tabs, technology strip, workflow early, features/themes/niches, exports/indexer, business-use cases, API/MCP, four main pricing cards plus full-width Enterprise, launch watchlist, FAQ, final CTA and contact. Fictional review examples were replaced by factual audience use cases; launch-watchlist status stays explicit. Five SVG product walkthroughs now illustrate the sidebar/editor style and remain labeled examples.

App: persistent grouped sidebar, small sticky top bar, theme switch and readable white work surface. All 12 prior destinations remain. At <=900px a native disclosure menu offers the same destinations and sign-out. Real saved websites precede onboarding/research panels on the overview.

Editor: page navigation, preview canvas and content inspector at desktop; progressive two/one-column layouts below breakpoints. New data-editor-page buttons call captureEdit before switching, preserve dirty state and reuse existing revision/save/draft-preview mechanisms. Existing IDs, sandbox restrictions and iframe-origin checks remain.

All shared public pages, SERP/Indexer landings, SERPUM guides/policies, auth and workspaces load the same theme. Generated websites and exported files retain their chosen theme; the redesign does not rewrite customer sites.

## Validation
npm run check and npm test are required. Emerald tests cover escaped page controls, unique editor IDs, sidebar/mobile navigation presence, source fonts and license files. API tests cover CSS/font routes and font-only CSP change; all existing account isolation, revision/ZIP/WordPress/auth/provider tests remain.

Browser QA uses disposable data under the original workspace work/emerald-qa-data, excluded from source packages. Verified email login, page-tree switching retaining a local edit, Apply, Save revision, refresh persistence, preview text, mobile sidebar destinations/sign-out, 30 mobile niche links, light/dark appearance and no horizontal overflow at a 390px viewport for homepage/editor/SERPUM. Font checks report both families available. Viewport override reset after QA.

Do not claim live production/account verification based solely on this local fixture. Release status and live deployment evidence are recorded in STATUS.md. Preserve Render disk, encryption key, signup gates and provider configurations.
