# SITOCAL redesign review
31 October 2026 · Decision study, not an approved implementation

## Recommendation
Choose **Emerald Studio** as the foundation: the product visibility of Ranklocal.cc, the clear segmentation of Ranklocal.site, and the business-outcome language of SitesLocal. Keep SITOCAL’s identity, but replace the current editorial interface with a coherent sans-serif product system. Use one brand system across the root website and app/editor/wp/serp subdomains; adapt the layout to each task.

## Evidence and scope
Reviewed the three live public homepages, their DOM/computed styles, public HTML and CSS. Browser measurements were taken around 1280px desktop width. Public homepages do not establish the quality or behavior of authenticated competitor dashboards, which were not inspected. This report does not adopt competitor performance, customer, indexing or ranking claims.

### Ranklocal.cc — product-led, light SaaS
White canvas, thin neutral dividers, warm orange actions, restrained centered hero and a large tabbed product preview. Computed hero: Google Sans, 48px/48px, weight 500; body: Inter Variable. Geist appears in bundled CSS but is not the rendered hero font. Flow: hero/demo → vendor logos → benefit summary → metrics → feature tabs → themes → video → discovery badges → indexer → process → testimonials → API/MCP → pricing → FAQ → final CTA/contact. Good inspiration for product demonstrations and progressive disclosure. The page is long; repeat less and prioritize the main journey.
Source: https://ranklocal.cc/

### SitesLocal — business-first service presentation
A rounded floating header over a blue gradient, oversized expressive headings, illustrations, business-owner imagery and repeated consultation prompts. Computed body: DM Sans; headline family: Instrument Sans. The large visible hero slogan is an h2 at 130px/900; the smaller h1 is 36px/700. Navy #072032 and vivid blue are prominent. Flow: business promise → problem/proof → directory coverage → services → benefits → service pricing → support differentiation → testimonials → consultation. Borrow approachable business messaging and contrasting section composition. Its managed-service sales structure is less suitable for SITOCAL’s self-service app.
Source: https://siteslocal.com/

### Ranklocal.site — focused technical SaaS
Dark navy #0F172A surfaces, indigo #4F46E5 actions, soft glows and compact bordered cards. Body: Inter; rendered hero heading uses a system sans stack at 60px/60px, weight 900. Flow: proposition/demo → six capabilities → niche packs → comparison → three steps → FAQ → closing CTA. Strong inspiration for a concise story, niche organization and structured comparisons. The dark-only treatment and heavy headings should not dictate every workspace screen.
Source: https://www.ranklocal.site/

## What to fix in SITOCAL
1. **Navigation hierarchy:** the top-level app navigation wraps across rows as features accumulate. Replace it with a persistent sidebar and a small top bar.
2. **Typography:** Georgia headlines and tiny Arial controls create an editorial/product mismatch. Use a consistent sans-serif hierarchy, readable form labels and tabular numbers for data.
3. **Visual hierarchy:** many bordered cards have equal emphasis. Make the project list or task canvas primary; use cards for summaries and choices.
4. **Page rhythm:** repeated cream/green sections and similar heading patterns flatten the marketing story. Alternate demonstration, proof, concise explanation and action.
5. **Product proof:** show credible previews of the builder/editor/search workflows early. Distinguish sample UI from real results.
6. **Information placement:** large niche and tool inventories belong in organized menus and hubs. The main header should contain a few meaningful groups.
7. **Interaction consistency:** establish one spacing, button, icon, input, badge and feedback system instead of accumulating page-specific overrides.

## Three redesign options
### 1. Emerald Studio — recommended
- Character: precise, confident and approachable; white-led rather than sage-led.
- Palette: ink #142923, primary #0B7659, tint #DFF3E8, background #F5F8F6, white panels. Retain the existing S logo; verify all text contrast in implementation.
- Proposed typography: Manrope 600–700 headings, Inter 400–600 body/interface; self-host licensed font files. Marketing hero 56–64px desktop / 36–40px mobile; body 16–18px; app text 14–16px.
- Homepage: centered product promise, immediate large product demonstration, compact workflow and themes, clear feature groups, pricing and FAQ.
- App: light work canvas, dark or very light sidebar, restrained green selected states, compact tables, project-scoped navigation.
- Best fit: SITOCAL as a website platform that also contains research tools. Strongest balance of brand continuity and usability.

### 2. Local Blue — business-first
- Character: energetic, helpful and accessible to business owners.
- Palette: navy #0B2338, blue #1269DA, pale blue #F2F7FD, white; small yellow #F7CE55 accents.
- Proposed typography: Instrument Sans headings and DM Sans interface, with less extreme headline scaling than SitesLocal.
- Homepage: split hero, concrete local-service website preview, useful niche examples and plain-language outcomes.
- App: white dashboard with blue focus states, guided setup and a prominent next step.
- Best fit: a stronger focus on individual local businesses and assisted onboarding.
- Tradeoff: less continuity with the existing green identity; imagery must feel specific rather than generic agency stock.

### 3. Midnight Signal — research-focused
- Character: analytical and technical.
- Palette: midnight #101827, panel #182235, violet #8573FF, mint #36C99A; light mode also required.
- Proposed typography: Inter for headings and interface, JetBrains Mono only for code, coordinates and technical labels.
- Homepage: focused dark hero with a working-product visual and concise capability groups.
- App: dense research tables, saved queries, filters and contextual panels.
- Best fit: SERP Engine and SERPUM as the lead products, or a later research workspace theme.
- Tradeoff: can make a general website builder feel more complex; dark layouts need careful chart, input and status contrast.

## Recommended public-page flow
1. Focused header: Product, Solutions, Resources, Pricing; Sign in and one main CTA. About/contact live under Resources/footer.
2. Concrete hero: what users can build and for whom.
3. Product demonstration: Builder, Editor and Search views with manual tab controls; optional gentle rotation that pauses on interaction.
4. Supported workflow/provider strip, accurately labeled.
5. Three-step creation workflow.
6. Website themes with actual previews.
7. Feature groups: Build → Customize → Publish → Research.
8. Niche examples; complete inventory on its hub.
9. Genuine customer evidence when available; omit manufactured reviews and metrics.
10. Separate discovery cards for Indexer, SERPUM and API/MCP, leading to their dedicated pages.
11. Pricing: Free, Starter $10, Growth $50, Agency $100; Enterprise as a separate contact option.
12. FAQ, final CTA, compact contact area and footer.

Keep all existing destinations reachable. Reordering sections does not require removing product pages or requested capabilities.

## Recommended app architecture
- **Sidebar:** Overview, Websites, Search Intelligence, Publishing; then Integrations, API/MCP, Activity, Settings/Billing.
- **Top bar:** workspace/project selector, breadcrumb, search/help, account. No second row of product links.
- **Builder:** brief → structure → design → generate/review. Show progress and save state.
- **Editor:** page tree left, editing canvas center, selected-element controls right; preview/save/export in one consistent toolbar.
- **WordPress converter:** upload → format selection → validation → download.
- **SERP Engine:** project/location selector, filters, results table and detail panel. Missing provider data stays a meaningful empty state.
- **SERPUM:** compact keyword/location form first; explanations below, with the library reachable from local navigation.
- **Integrations:** search and category filters, consistent logo size and clear availability. Separate connected/saved providers from catalog-only entries.
- **Settings:** group account, authentication, billing and preferences rather than adding more main navigation items.

## Shared system and rollout
Use a 4/8px spacing scale, 1200–1280px marketing content width, 12-column desktop grid, 12–16px panel radii and modest shadows only for elevation. Give dense data screens room instead of applying marketing padding. Use 44px touch targets, visible keyboard focus, reduced-motion support and explicit empty/loading/error/success states.

Selection next: approve one direction, then create full-fidelity homepage, dashboard and editor designs. Validate those three before migrating components across every route. Keep existing action/data contracts, account isolation and exports intact. Test responsive layouts, keyboard use and light/dark states before release. No production CSS or application behavior changed during this design study.

## Preview
Open SITOCAL-REDESIGN-DIRECTIONS.html (or outputs/sitocal-redesign-directions.html in the original workspace) to switch between three original layout/color concepts. Preview numbers are explicitly illustrative. Proposed font families are stated but not installed in that lightweight concept file.
