# Session 037 — Public website and supporting pages
2026-10-30 (Asia/Karachi). Version 0.1.6.

Rebuilt the logged-out home page in Fieldwork style: two rotating image-tab sections, 18-brand slow marquee, auto-expanding three-style theme rail, 12 niche icons, focused process, planned indexing and API/MCP sections, six explicitly fictional review layouts, five owner-priced plans, six planned payment methods, unverified launch-watchlist logos, searchable categorized FAQs, final CTA and durable contact form. Added About, Contact, Blog (three original field notes), Products & Services, five policy pages, API/MCP and indexing roadmap pages. Account aliases route to actual sign-in, invitation signup and dashboard flows.

Owner supplied: AJ Digit, LLC (dba SITOCAL), contact@sitocal.com. Pricing Free / $10 / $50 / $100 / custom; USD per month assumed, quotas unannounced. Checkout, payment providers, public API/MCP, indexing engine, verified testimonials/listings and final legal terms are not implemented or claimed. Policies are launch drafts. Enquiries are saved privately, not emailed; npm run enquiries:list is an operator-only shell utility. Do not publish its personal-data output.

Validation: syntax checks and all 32 tests passed, including real SVG/source validation, public routes, assets, consent/origin/CSRF handling, authenticated enquiries, honeypot and throttling plus prior builder/editor/export coverage. Browser observed auto rotation, manual tab pause, FAQ search, phone-width (390px) and desktop (1440px) composition, and successful local contact submission with persisted reference. Header/tablet preview had no broken top-level images. No live customer account actions performed.

PR #3 merged into main at 96c93a9df465638342a859019c898fcb9a9f3ade. All 88 local source files hash-matched the branch before merge. Live health returned HTTP 200 status ok version 0.1.6 on sitocal.com, the Render hostname and app/editor/wp/serp subdomains. Local browser contact submission was independently confirmed as one stored enquiry. No production contact submission or customer-account test was performed. Read docs/MARKETING-RELEASE.md for remaining launch decisions. Keep the existing Render disk and encryption key. Current product remains a private alpha.

Reference: https://ranklocal.cc/ (section flow only). Google indexing eligibility: https://developers.google.com/search/apis/indexing-api/v3/quickstart.

Next: confirm monthly billing and plan quotas, configure checkout, obtain real testimonials/listing URLs, finalize policy jurisdiction/retention/refund terms, configure contact-email delivery and finish real provider end-to-end validation. Existing .env, data, registration gates and production user data were not reset.
