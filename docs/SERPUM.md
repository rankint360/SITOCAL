# SERPUM — local Google search checker (0.2.0)

## What ships

Public URL: https://serp.sitocal.com/serpum. Eight original guides use descriptive title-based slugs under /serpum/. Numbered legacy URLs /serpum/blog-1 through /serpum/blog-8 permanently redirect (301) to their matching title-based URLs; internal links and canonicals use the current slugs. The shared Tools megamenu links to SERPUM separately from the authenticated SERP workspace.

The Fieldwork landing page includes keyword + Search Google, 249 country/territory options, 67 interface-language options, address + Geocode, explicit address-candidate selection, latitude/longitude editing, approximate location radius, optional SafeSearch request, prepared-link copying, map verification, context summary, workflow steps, an original background explainer, original guides and FAQs. Default country is Pakistan; coordinates are never assumed from a placeholder. No browser GPS permission is requested.

Search links are built locally using Google's q, gl, hl, UULE and pws parameters. The coordinate UULE payload uses scaled latitude/longitude, a fresh microsecond timestamp and an approximate radius. The browser opens Google's own result page; there is no server Google scraping, embedded result imitation, rank certification, device spoofing, stored SERP result, or network-location/VPN change. Google may ignore or interpret undocumented parameters differently and may use other signals. Always check Google's reported location. The connected /serp workspace remains the separate provider-backed product.

## Geocoding and deployment configuration

No new key is required for modest testing with the default Photon demo service. Photon uses OpenStreetMap data and permits project use within reasonable request limits, but offers no availability guarantee. Upgrade to a private/paid compatible endpoint before broader usage. Review https://github.com/komoot/photon#demo-server and https://github.com/komoot/photon/blob/master/docs/api-v1.md.

Optional Render variables:

    SERPUM_GEOCODING_ENABLED=true
    SERPUM_GEOCODER_PROVIDER=photon
    SERPUM_GEOCODER_URL=https://photon.komoot.io/api/
    SERPUM_GEOCODE_DAILY_LIMIT=500

Absent variables use those defaults. Set ENABLED=false to disable only address lookup; manual coordinate searches remain usable. The endpoint is operator-controlled HTTPS only, with no embedded credentials/custom port, no client URL override and no redirects. Photon requests use the selected country. Address labels request English, French or German when selected; other Google-interface choices use English address labels. Google search language remains the user's selected language.

The server enforces one provider request at a time and at least 1.1 seconds between starts, a default 500-provider-request daily cap, bounded 256-entry 24-hour memory cache, eight-second timeout, maximum 256KB response and five candidate results. No autocomplete, grid/bulk queries or automatic retry exists. API requests have same-origin checks, an eight-request/minute network-address limiter and 2KB body limit. Reverse proxies can make the network-address limit shared. All cache and quotas are currently process-local: keep one service instance or implement a shared limiter/cache before scaling.

A Nominatim-compatible adapter is available for an operator-controlled service via PROVIDER=nominatim and an HTTPS search endpoint. **Public Nominatim is not enabled by default.** Its current usage policy explicitly restricts generic/app-builder integrations absent an informed responsible developer choice. A request to nominatim.openstreetmap.org fails unless the operator deliberately configures SERPUM_NOMINATIM_PUBLIC_ACK=true after reviewing https://operations.osmfoundation.org/policies/nominatim/. Do not set this merely to silence an error. Prefer Photon, a private Nominatim instance or a suitable paid service.

## Privacy and failure behavior

Keyword and coordinate selection stay in the browser until the user opens or copies the Google URL. Address lookup sends address/country to the chosen geocoder; it does not send account identifiers or Google cookies. The service's memory cache contains hashed lookup keys and coordinate/address-label results for up to 24 hours, clears on restart and is not tied to accounts. The chosen point/keyword are not persisted in browser storage or saved as an account observation. A copied Google link contains them; no automatic sharing happens.

Candidates are displayed using textContent, never provider HTML. Editing a geocoded address or changing country invalidates that selected point and generated link. No match, timeout, malformed coordinates, throttling and provider errors have distinct actionable UI messages; none becomes a fabricated search result. Unknown coordinates never silently become 0,0. Manual 0,0 is valid. Disabling geocoding does not disable manual-coordinate search.

The privacy notice has been updated to describe address processing, browser theme preference and external public-page translation. Existing private-alpha legal-review and provider-activation limitations still apply.

## Reference analysis and independent implementation

Reviewed https://valentin.app/, its linked UULE explanation, current-location tool, browser-extension explanation, mobile simulator, bulk-inspection and entity tools, two metadata experiments, related-content tool, News-topic and stick/ved decoders, Discover tracking, robots/noindex guide, SERP experiment sharing, rendering test, terms and privacy pages. Its public HTML and loc.js were inspected locally for workflow analysis. Those files remain outside the source tree and are not packaged or published.

Observed reference workflow: choose country/language, geocode a desired address or enter coordinates, prepare a Google URL, open its result page. Its explanatory sections describe usage, checks and location background. SERPUM reproduces that functional workflow with independent source, its own UI, original map-like CSS/SVG artwork and original educational copy. It does not call Valentin's geocoder, load its scripts, reproduce its articles/screenshots, copy its site artwork or claim affiliation. “Tool background” is provided as an original explanatory section.

Original guide topics: repeatable local checks; country/language/coordinate distinctions; geocoding verification; location hints; safe research context sharing; device limits; indexing/ranking/Discover distinctions; practical website audits. Source links appear in the articles. Historical cookie-sharing and old analytics recipes are not reproduced.

Key research sources:
- https://valentin.app/ and https://valentin.app/uule.html (observed tool/protocol context; not a Google support guarantee)
- https://support.google.com/websearch/answer/179386 (location signals)
- https://support.google.com/websearch/answer/12412910 (personalization)
- https://developer.chrome.com/docs/devtools/device-mode (device emulation)
- https://support.google.com/webmasters/answer/9012289 and /9216516 (inspection and Discover)
- https://developers.google.com/search/docs/appearance/title-link and /snippet
- Photon docs and Nominatim policy linked above

## Validation and handoff

Run npm run check and npm test. Fixture coverage includes UULE scaling/encoding, valid zero, coordinate/keyword/locale rejection, geocoder country filtering, cache/concurrency/daily limits, disabled state, invalid/oversized response handling, public routes/metadata/assets, provider configuration and original-guide structure. Tests do not contact providers. The live low-volume landmark lookup and browser sample used public Liberty Market, Lahore coordinates; Google displayed that Lahore area in the result page. This verifies a sample, not every country/language combination or future Google behavior.

Preserve the existing Render disk, encryption key and registration settings. This public checker does not open account registration or change billing. Before release, verify every new asset is in the source package, branch matches local Git blob hashes, merge to main, verify /api/health version 0.2.0, all nine SERPUM pages, runtime CSS/JS and one low-volume public address lookup.
