# Emerald Studio page coverage
31 October 2026 · Release 0.3.1

## Automated public route coverage
All 74 registered public routes plus / and /serp-home are tested for HTTP 200, one H1, shared font/theme assets, navigation, unique IDs and local anchor targets. The signed-in route HTML is a client shell; workspace APIs and rendering are tested separately.

- /about
- /api-mcp
- /blog
- /contact
- /features
- /google-indexer
- /leadsmart-coverage-intelligence
- /niche-packs
- /niche-packs/appliance-repair
- /niche-packs/auto-detailers
- /niche-packs/automotive
- /niche-packs/carpet-cleaning
- /niche-packs/chiropractor
- /niche-packs/cleaning
- /niche-packs/contractors
- /niche-packs/damage-restoration
- /niche-packs/dentists
- /niche-packs/electrician
- /niche-packs/garage-doors
- /niche-packs/handyman
- /niche-packs/hvac
- /niche-packs/junk-removal
- /niche-packs/landscaping
- /niche-packs/law-firms
- /niche-packs/locksmith
- /niche-packs/med-spas
- /niche-packs/movers
- /niche-packs/optometrists
- /niche-packs/painting
- /niche-packs/pest-control
- /niche-packs/physiotherapists
- /niche-packs/plumbing
- /niche-packs/pool-service
- /niche-packs/pressure-washing
- /niche-packs/restaurants
- /niche-packs/roofing
- /niche-packs/salons
- /niche-packs/tree-care
- /pricing
- /privacy-policy
- /products-services
- /refund-policy
- /serpum
- /serpum/a-cleaner-serp-comparison-without-sharing-account-cookies
- /serpum/a-practical-local-search-check-from-brief-to-browser
- /serpum/build-a-useful-local-search-audit-from-small-observations
- /serpum/country-language-and-coordinates-answer-different-questions
- /serpum/desktop-mobile-and-the-limits-of-a-browser-check
- /serpum/features/
- /serpum/features/chrome-render-engine-test.html
- /serpum/features/entity-search.html
- /serpum/features/google-news-topic-decoder.html
- /serpum/features/gs-location-changer.html
- /serpum/features/inspect.html
- /serpum/features/mobile-device-simulator.html
- /serpum/features/people-also-view.html
- /serpum/features/prevent-url-indexing.html
- /serpum/features/share-serp-experiment.html
- /serpum/features/stick-parameter-decoder.html
- /serpum/features/track-google-discover.html
- /serpum/features/two-description-meta-tags.html
- /serpum/features/two-title-tags.html
- /serpum/features/uule.html
- /serpum/features/ved-parameter-decoder.html
- /serpum/features/whereami.html
- /serpum/geocoding-an-address-precision-starts-with-verification
- /serpum/indexing-rankings-and-discover-are-different-reports
- /serpum/privacy
- /serpum/terms
- /serpum/uule-a-location-hint-not-a-new-network-identity
- /service-policy
- /shipping-policy
- /terms-and-conditions
- /why-sitocal

## Shared authenticated workspaces
Overview/builder, editor, WordPress converter, SERP research, domain search, publishing, integrations, API/MCP, indexing, billing, account/sign-in and activity all use the same responsive shell and tokens.

## Browser samples
390px checks passed without horizontal page overflow for About, Blog, Contact, Products & Services, Features, Comparison, Pricing, Niche directory, Appliance Repair guide, Privacy Policy, Google Indexer, SERP landing, SERPUM library and SERPUM terms; wp/developer/indexing/billing/account workspace checks also passed. Integration and niche searches return correct counts, and empty filters show a helpful state. Available-only shows 11 current connectors, separate from 10 catalog entries. Viewport was restored.

Desktop reviewed: About, policy reader, converter, developer and dark Indexer. These are representative visual checks, not a claim that every route was separately screenshot-tested in every browser. Existing 70 tests cover source packaging and prior account/save/export/provider workflows as well.

## Deployment
PR #12 merged into main at f6756e85532b91d6d81d6be97f92b898a688c965. All 135 source files matched the branch before merge. Live verification passed 76/76 public pages (74 registered routes plus root/SERP landing), all six hostnames reported HTTP 200 version 0.3.1, and app/marketing JS plus all eight shared UI stylesheets byte-matched source. Browser verified live About layout and saved outputs/emerald-sitewide-live.png. Portable source archive refreshed without runtime data or secrets. Production registration, payment/provider setup, customer-generated website themes and request limits are unchanged.
