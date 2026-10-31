// Original SITOCAL explanations; source references are attribution, not copied text or bundled tools.
export const serpumFeatures=[
  {
    "slug": "inspect",
    "title": "Google Bulk Inspect URLs",
    "summary": "Read indexing evidence for a list of URLs without confusing inspection with an indexing request.",
    "sections": [
      [
        "What bulk inspection answers",
        "URL Inspection reports what Google knows about a URL in a Search Console property you can access. Useful fields include the indexing verdict, crawl state, canonical URL and last crawl time. An API response is evidence about the indexed version; it is not a live crawl and does not force a page into search."
      ],
      [
        "A practical workflow",
        "Connect the correct Google account in the SITOCAL indexing workspace, select an authorized property and submit a small list of matching URLs. Review each outcome before drawing conclusions. Authentication and operator Google API configuration must be enabled first; this explanation page does not request Google credentials."
      ],
      [
        "Review the report",
        "Group genuine indexing exclusions separately from permission failures, quota errors and unavailable reports. Compare Google’s canonical choice with your intended canonical and investigate blocked crawling or unexpected redirects. Export the workspace CSV to retain a dated review rather than treating missing data as a failed ranking."
      ],
      [
        "Limits and next steps",
        "Google applies property and project quotas. Inspect representative pages first and avoid repeating a batch while a request is pending. Use the Google Indexer landing page to enter the existing authenticated workflow; no new bulk-inspection engine or Excel exporter is embedded in this guide."
      ]
    ],
    "sources": [
      [
        "Google URL Inspection API",
        "https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/inspect.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "entity-search",
    "title": "Google Entity Search",
    "summary": "Understand entity identifiers and why entity-based results differ from ordinary keyword searches.",
    "sections": [
      [
        "Entities are concepts",
        "An entity identifies a person, place, organization or other concept rather than a sequence of search words. A name may be ambiguous: two businesses can share a name, while one business can have several spellings. Research should record both the human-readable label and its source."
      ],
      [
        "Identifiers and historical interfaces",
        "Knowledge Graph and former Freebase identifiers often begin with /m/ or /g/. Older search experiments used additional URL parameters to request entity-oriented lists. Those interfaces were not a stable public API, and a previously working URL may now produce ordinary results or nothing useful."
      ],
      [
        "How to research an entity",
        "Start with a normal Google search for the full name plus a distinguishing city, organization or topic. Compare the knowledge panel, official website and other reliable references. Record the country, language and date. Do not infer that similarly named panels represent the same entity."
      ],
      [
        "What this page provides",
        "This is an explanation, not an entity autocomplete service or a guaranteed recreation of Google’s historical Interesting Finds interface. SERPUM can prepare a localized keyword search; use official data services for repeatable programmatic research and check their access terms."
      ]
    ],
    "sources": [
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/entity-search.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "uule",
    "title": "UULE Explained",
    "summary": "Understand the location hint SERPUM includes in a Google search URL.",
    "sections": [
      [
        "Three independent controls",
        "SERPUM uses UULE for a requested location, hl for the interface language and gl for country context. These controls answer different questions. Changing the language does not move a device, and changing a country preference does not identify an exact street."
      ],
      [
        "Place names and coordinates",
        "Researchers have observed both canonical-place and coordinate forms of UULE. SERPUM uses a coordinate payload with latitude and longitude represented as integers at ten-millionths of a degree, plus a timestamp and radius hint. The encoded value is placed in the search URL rather than written into a Google cookie."
      ],
      [
        "How to use the hint",
        "Choose your country and language in the checker, geocode a public address, then verify the selected point. Search opens Google directly. At the bottom of desktop results, compare Google’s displayed location with the requested place. If the address was ambiguous, select a different candidate or supply known coordinates."
      ],
      [
        "What it cannot promise",
        "UULE is not a VPN or a supported guarantee that every result will match a person physically at the point. Google may use session, network and device signals as well. A prepared link exposes its keyword and chosen point to anyone you share it with. SERPUM does not certify rankings or hide your network location."
      ]
    ],
    "sources": [
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/uule.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": "q=plumber+near+me&gl=pk&hl=en&uule=LOCATION_HINT&pws=0"
  },
  {
    "slug": "whereami",
    "title": "See Your Current Location",
    "summary": "Separate your real device location from the place requested in a SERPUM search.",
    "sections": [
      [
        "Which location are you checking?",
        "An approximate network location, a device-reported coordinate and Google’s search context are different observations. They can disagree without any tool being broken. A VPN can change the network signal while the browser’s location service continues to report the device’s actual position."
      ],
      [
        "Check Google’s interpretation",
        "Open Google and search for where am I. A location panel may appear. On desktop, also inspect the location statement at the bottom of the results. That statement is more useful for interpreting a search than assuming the domain or language proves where Google placed it."
      ],
      [
        "Check your device deliberately",
        "A browser can ask for location permission through its Geolocation API. Only allow it when you intend to share your device position with that site. SERPUM’s checker uses an address you choose and does not ask for GPS access; this page does not automatically query an IP-location provider or request permission."
      ],
      [
        "Use a chosen place instead",
        "To research a different market, return to the checker and enter that market’s address. Verify its coordinates on the map before opening Google. Do not substitute your own device location when the research brief calls for a customer’s city or neighborhood."
      ]
    ],
    "sources": [
      [
        "Chrome Sensors location controls",
        "https://developer.chrome.com/docs/devtools/sensors/"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/whereami.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "gs-location-changer",
    "title": "Google Search Location Changer Browser Plugin",
    "summary": "Compare browser extensions with SERPUM’s per-search location links.",
    "sections": [
      [
        "What an extension can change",
        "A location extension may alter request headers, cookies or browser settings for matching Google pages. Its effect can persist across searches until you disable it. Exact behavior depends on the extension version, browser permissions and the site’s current implementation."
      ],
      [
        "Check the publisher and permissions",
        "GS Location Changer is a third-party project associated with Valentin.app; it is not a SITOCAL extension. Follow the original author’s page to check the current official store listings and code. Review permissions, maintenance and privacy information before installing any extension."
      ],
      [
        "Choose a workflow",
        "An extension can be convenient for repeated research in one browser. SERPUM instead prepares a search-specific URL with country, language and coordinate hints, without installing software or changing Google cookies. Both approaches require checking the location Google actually reports."
      ],
      [
        "Return to your normal context",
        "If you use an extension, note the settings you changed and disable overrides when finished. A new search tab alone may not reset extension rules. SITOCAL does not distribute, install or provide support for that third-party plugin through this page."
      ]
    ],
    "sources": [
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/gs-location-changer.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "two-title-tags",
    "title": "Two Title Tags Experiment",
    "summary": "Plan a controlled test of duplicate title elements without damaging a production page.",
    "sections": [
      [
        "The question",
        "What does a browser display, and what does Google show, when a document contains two title elements? These are separate observations. Google can construct a title link from several sources, so a tab title alone cannot establish how search results will look."
      ],
      [
        "A controlled method",
        "Use a disposable test page you own, with distinctive first and second titles and a stable heading. Record its source, rendered DOM, crawl timing and observed search title. Change one variable at a time and keep a control page with one descriptive title."
      ],
      [
        "Interpret the evidence",
        "A single query or screenshot does not prove a universal rule. Search titles can vary by query and can lag behind a source update. Record a result as observed on a date, not as a guaranteed algorithmic preference."
      ],
      [
        "Production recommendation",
        "Keep one clear, descriptive title per page. The sample below is an intentionally invalid test fixture, not recommended markup. This guide itself has one title; it does not publish duplicate head elements or claim that SITOCAL has run a live Google experiment."
      ]
    ],
    "sources": [
      [
        "Google title-link guidance",
        "https://developers.google.com/search/docs/appearance/title-link"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/noindex/title.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": "<title>Test A: first title</title>\n<title>Test B: second title</title>"
  },
  {
    "slug": "two-description-meta-tags",
    "title": "Two Description Meta Tags Experiment",
    "summary": "Distinguish supplied meta descriptions from the snippet Google chooses for a query.",
    "sections": [
      [
        "The question",
        "If two description meta tags are present, which text appears in a search snippet? The outcome may be neither: Google can choose page content relevant to the query. A description is an input to snippet generation, not a fixed display instruction."
      ],
      [
        "Design the test",
        "On a disposable page, use clearly distinguishable descriptions while keeping the visible copy stable. Record the HTML source and the query used to inspect it. Compare with a control page containing one description. Allow for recrawling before attributing a result to a change."
      ],
      [
        "What to record",
        "Capture the query, locale, device, date, canonical URL and observed snippet. Separate cached or older indexed content from the current rendered page. Avoid claiming an ordering rule from one example, especially where the query matches body text."
      ],
      [
        "Use clean production markup",
        "Publish one useful description describing the actual page. The duplicate tags shown here are a test fixture only. This explanation page has one description, and SITOCAL does not present an unrun experiment as a measured result."
      ]
    ],
    "sources": [
      [
        "Google snippet guidance",
        "https://developers.google.com/search/docs/appearance/snippet"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/noindex/description.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": "<meta name=\"description\" content=\"Test A: first description\">\n<meta name=\"description\" content=\"Test B: second description\">"
  },
  {
    "slug": "people-also-view",
    "title": "Google People Also View",
    "summary": "Understand related-content discovery without treating recommendations as a ranking report.",
    "sections": [
      [
        "A different kind of relationship",
        "Related-content panels connect a page or topic to other material a system considers useful. Such associations are not proof that two pages share an owner, that one links to the other, or that either ranks for a particular keyword."
      ],
      [
        "Historical context",
        "The reference tool explored a Google related-content interface described as People Also View. Undocumented discovery interfaces can change or disappear. SERPUM does not expose a working Google recommendation feed or promise that the historical endpoint remains available."
      ],
      [
        "A useful research approach",
        "Identify the seed URL and its topic, then compare related themes using current public search results and sources you can inspect. Record how each item was found. Keep observed recommendations distinct from your own editorial suggestions."
      ],
      [
        "Apply the findings carefully",
        "Use related topics to develop research questions and content briefs. Verify business facts independently before adding them to a client site. For local comparisons, use a consistent query and chosen place in the SERPUM checker."
      ]
    ],
    "sources": [
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/pivot.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "google-news-topic-decoder",
    "title": "Google News Topic URL Decoder",
    "summary": "Understand opaque topic URLs and what a decoded identifier can—and cannot—tell you.",
    "sections": [
      [
        "Topics and encoded identifiers",
        "A Google News topic URL can contain an encoded token rather than a readable topic name. Researchers have examined some formats as Base64-encoded binary structures. Formats are not a public compatibility promise and may differ across URL generations."
      ],
      [
        "Inspect without fetching",
        "For a manual review, keep a copy of the original URL and identify its host and path before examining the token. Decode only a value you intend to inspect locally; a successful Base64 conversion does not establish the meaning of its fields."
      ],
      [
        "Avoid false conclusions",
        "An identifier found inside a token may describe a topic or entity, but it does not establish the selection rules for the news feed. Unrecognized fields should stay unrecognized. A generic binary parser cannot reliably assign Google-specific names without a verified schema."
      ],
      [
        "Scope of this page",
        "This page explains the research workflow and links to the original exploration. It does not provide a live topic decoder or encoder. Use Google News directly to inspect the current topic presentation and retain the date and market context with your notes."
      ]
    ],
    "sources": [
      [
        "Protocol Buffers wire format",
        "https://protobuf.dev/programming-guides/encoding/"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/topic.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "track-google-discover",
    "title": "How to Track Google Discover",
    "summary": "Use the right reporting source and avoid carrying old analytics recipes into GA4.",
    "sections": [
      [
        "Start with the Discover report",
        "Use the Discover performance report in Google Search Console when it is available for your property. It describes Discover impressions and clicks. Absence of a report is not proof of zero traffic, and Discover eligibility does not guarantee exposure."
      ],
      [
        "Analytics answers a different question",
        "GA4 measures site activity under your configured collection and consent settings. Referrer-based guesses can mix Google surfaces or miss visits with limited referrer information. Treat a custom segment as an approximation, not a direct replacement for the Search Console report."
      ],
      [
        "Historical filters need context",
        "Older tutorials used Universal Analytics views and referrer rewrites. Those instructions should not be applied literally to GA4. Keep existing measurement intact and test any new classification separately before relying on it for client reporting."
      ],
      [
        "A repeatable review",
        "Compare matching date ranges, landing pages and time zones. Record which numbers come from Search Console and which come from analytics. SITOCAL’s optional Google connections require configuration and authorization; this guide does not activate tracking or inject an analytics script."
      ]
    ],
    "sources": [
      [
        "Google Discover documentation",
        "https://developers.google.com/search/docs/appearance/google-discover"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/discover-tracking.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "prevent-url-indexing",
    "title": "How to Not Index a URL",
    "summary": "Choose the correct noindex mechanism and let the crawler see it.",
    "sections": [
      [
        "Use an explicit directive",
        "For an HTML page, use a robots meta tag with content noindex. For a non-HTML resource, an X-Robots-Tag response header can express the same intent. Apply the directive to the actual response served at the URL, including relevant variants."
      ],
      [
        "Crawling and indexing are different",
        "If robots.txt prevents crawling, Google may be unable to read a noindex directive on the page. Do not assume that a disallow rule removes an already known URL from search. Authentication is the appropriate boundary for private information; noindex is not access control."
      ],
      [
        "Verify the deployed response",
        "Check status codes, headers, rendered markup and the canonical destination. Use Search Console inspection to review Google’s recorded state after it revisits the URL. Temporary removal tools are distinct from a lasting indexing directive."
      ],
      [
        "Keep the syntax boring",
        "Use documented directives rather than relying on historical tolerance for malformed tags or misspellings. The sample is displayed as code only and does not add noindex to this guide. Review a staging copy before changing a production site’s indexing settings."
      ]
    ],
    "sources": [
      [
        "Google noindex guidance",
        "https://developers.google.com/search/docs/crawling-indexing/block-indexing"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/robotsmeta.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": "<meta name=\"robots\" content=\"noindex\">\n\n# Alternative response header:\nX-Robots-Tag: noindex"
  },
  {
    "slug": "share-serp-experiment",
    "title": "How to Share a Google SERP Experiment",
    "summary": "Share reproducible observations while keeping browser cookies private.",
    "sections": [
      [
        "Share the research brief",
        "Provide the exact query, selected place, country, language, device, date and a screenshot with personal information removed. Include the SERPUM prepared link if its chosen coordinates are appropriate to share. A recipient can then repeat the requested search context."
      ],
      [
        "Why another person may see something else",
        "Google can run experiments whose assignment depends on signals beyond a URL. Matching a query and location does not guarantee matching a search layout, account state or experimental feature. Record a difference as a useful observation."
      ],
      [
        "Keep cookies out of the handoff",
        "Historical methods proposed transferring NID cookie values. SITOCAL does not request, store or exchange Google cookies. Share sanitized screenshots and search settings instead; cookies can contain identifiers or preferences and should not be published in reports."
      ],
      [
        "A concise evidence record",
        "Separate what you observed from what you infer. Note whether the browser was signed in, but omit account identifiers. If a feature disappears, preserve the observation rather than repeatedly changing account or browser settings to force the same result."
      ]
    ],
    "sources": [
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/nid.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "mobile-device-simulator",
    "title": "Google Search Mobile Device Simulator",
    "summary": "Understand what a mobile preview changes before comparing search results.",
    "sections": [
      [
        "Viewport is only one signal",
        "A narrow frame changes available space, but it does not necessarily change the browser’s user agent, input model or Google’s interpretation of the device. An iframe showing a small page is not proof of a genuine smartphone search."
      ],
      [
        "Use supported browser tools",
        "Chrome DevTools Device Mode can emulate several device characteristics. Use Sensors separately when you need browser-reported coordinates. Record which settings were emulated, and compare important observations with a real device when possible."
      ],
      [
        "Keep location controls separate",
        "SERPUM’s checker prepares country, language and location hints but opens results in your actual browser. It does not use an advertising preview parameter or silently impersonate a phone. Keep the query and place fixed when comparing desktop and mobile."
      ],
      [
        "Scope of this explanation",
        "This guide provides a device-testing workflow rather than an embedded mobile Google simulator. It does not proxy Google results, bypass framing restrictions or certify mobile rankings. Follow the official Device Mode documentation for the current controls."
      ]
    ],
    "sources": [
      [
        "Chrome Device Mode",
        "https://developer.chrome.com/docs/devtools/device-mode"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/simulator.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "stick-parameter-decoder",
    "title": "Google Stick Parameter Decoder",
    "summary": "Read the structure of a search relationship token without inventing its meaning.",
    "sections": [
      [
        "Where stick appears",
        "Some Google search links carry a stick parameter associated with an entity navigation or relationship context. Its presence does not by itself identify a ranking factor, a backlink or a stable public data interface."
      ],
      [
        "Encoding layers",
        "Historical research described URL-safe Base64, sometimes compressed data, and Protocol Buffers fields. A decoding workflow must distinguish text, compressed bytes and wire-format fields. Unexpected input should be rejected or labeled unknown instead of interpreted as a familiar entity."
      ],
      [
        "What a responsible decoder would show",
        "Keep the original token, byte length and raw field numbers alongside any verified interpretation. Bound decompression and nesting to avoid processing enormous or malformed input. Never execute decoded text or fetch a URL merely because it appears in the data."
      ],
      [
        "Current scope",
        "This is an explanatory guide, not a working stick decoder. The reference links document the original investigation; Google can change the token format. A decoded relationship should be validated against the visible search interaction that produced it."
      ]
    ],
    "sources": [
      [
        "Protocol Buffers encoding",
        "https://protobuf.dev/programming-guides/encoding/"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/stick.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "ved-parameter-decoder",
    "title": "Google Ved Parameter Decoder",
    "summary": "Distinguish an encoded interaction token from a public analytics contract.",
    "sections": [
      [
        "An interaction context",
        "Google links and page elements may include a ved value. Researchers have examined these tokens to understand search interactions. A token is not a documented export of all search tracking, and a field’s apparent meaning may be specific to a historical example."
      ],
      [
        "Decode structure before meaning",
        "Some values contain a prefix and URL-safe Base64-encoded binary fields. A wire-format parser can expose field numbers and primitive values without knowing their semantic names. Preserve that distinction when recording an observation."
      ],
      [
        "Keep the analysis local",
        "Remove unrelated query strings before sharing examples, because URLs can contain queries and other identifiers. Do not execute decoded content. A valid binary structure does not prove that a guessed timestamp, position or result type is correct."
      ],
      [
        "What this guide offers",
        "SERPUM explains the decoding approach and links to the original research; it does not currently implement a ved decoder or collect tokens from your browsing. Use verified schemas and small controlled samples for any future parser."
      ]
    ],
    "sources": [
      [
        "Protocol Buffers encoding reference",
        "https://protobuf.dev/programming-guides/encoding/"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/ved.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  },
  {
    "slug": "chrome-render-engine-test",
    "title": "Google Chrome Render Engine Test",
    "summary": "Test rendering evidence without guessing Googlebot’s exact version from one browser feature.",
    "sections": [
      [
        "Browser support is not crawler identity",
        "A feature check in your browser tells you about that browser. It does not establish which engine Googlebot used, whether a crawler visited the page, or whether Google indexed the rendered output. Several browser versions may support the same feature."
      ],
      [
        "Inspect your page’s rendering",
        "Use Search Console’s live inspection tools and available rendered output to investigate a page you own. Compare source HTML with the resulting DOM and check whether essential content depends on scripts or blocked resources."
      ],
      [
        "A feature matrix is supporting evidence",
        "When testing JavaScript APIs, record the environment and date and use capability detection for actual compatibility decisions. Avoid presenting the newest supported API as a precise version fingerprint. A genuine crawler observation also requires validated request identity and a reliable collection design."
      ],
      [
        "SERPUM’s current scope",
        "This explanation does not maintain a live Googlebot feature database or claim that its own page has measured Google’s current Chrome version. The guide links to current JavaScript SEO documentation so you can investigate rendering problems with the right evidence."
      ]
    ],
    "sources": [
      [
        "Google JavaScript SEO basics",
        "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics"
      ],
      [
        "Reference and inspiration: Valentin.app",
        "https://valentin.app/render.html"
      ]
    ],
    "tag": "SERPUM EXPLAINED",
    "minutes": 4,
    "code": ""
  }
];
export const serpumNotices=[
  {
    "slug": "privacy",
    "title": "SERPUM Privacy Policy",
    "summary": "How AJ Digit, LLC [d/b/a SITOCAL] handles information used by the SERPUM checker and explanation pages.",
    "tag": "SERVICE NOTICE",
    "minutes": 4,
    "sections": [
      [
        "Scope and operator",
        "SERPUM is operated by AJ Digit, LLC [d/b/a SITOCAL]. Contact contact@sitocal.com for privacy questions or verified access, correction and deletion requests. This notice supplements the platform Privacy Policy and describes the current development alpha as of 31 October 2026."
      ],
      [
        "Search links and chosen places",
        "The checker assembles a Google search link in your browser. When you open it, Google receives the keyword, selected country, language and encoded coordinate hint along with ordinary connection information. A copied link contains that same search context. SERPUM does not request device GPS permission or maintain account-linked keyword and coordinate histories."
      ],
      [
        "Address lookup",
        "Pressing Geocode sends your address, country and language to SITOCAL’s server and the configured geocoder, currently Photon using OpenStreetMap data. Results and hashed request keys may be held in a bounded in-memory cache for up to 24 hours and clear on restart. Lookups are rate-limited. Use public addresses when testing; do not submit sensitive personal location information unnecessarily."
      ],
      [
        "Hosting, logs and local preferences",
        "The service runs on Render with Cloudflare DNS. Network addresses are processed for requests and in-memory rate limiting; hosting providers may maintain operational logs under their own terms. Browser localStorage remembers the site’s theme. This release does not add third-party advertising or analytics trackers to SERPUM."
      ],
      [
        "Accounts and Google connections",
        "The public checker and guides need no account. If you use other SITOCAL workspaces, their account, session, saved-project and Google connection processing is covered by the platform policy. Search Console information in those authenticated tools may be stored in inspection reports; it is not accurate to claim that all platform Google data stays only in a browser. Google passwords are entered with Google, not into this public checker."
      ],
      [
        "External services and your choices",
        "Opening Google, map verification, external references, LinkedIn or Google Translate shares a request with that destination and invokes its policies. The feature guides do not automatically load third-party tools or request location permissions. You can enter known coordinates instead of geocoding and can choose not to open a prepared link."
      ],
      [
        "Retention, transfers and updates",
        "Provider infrastructure may process information internationally. A fixed platform retention schedule and automated deletion are not yet implemented; contact us for a verified request. No system guarantees absolute security. This alpha notice will be updated as processing changes and remains subject to final operational and legal review."
      ]
    ],
    "sources": []
  },
  {
    "slug": "terms",
    "title": "SERPUM Terms of Service",
    "summary": "The conditions and practical limits of using SITOCAL’s public local-search checker and reference library.",
    "tag": "SERVICE NOTICE",
    "minutes": 4,
    "sections": [
      [
        "Who provides the service",
        "AJ Digit, LLC [d/b/a SITOCAL] provides SERPUM. Questions can be sent to contact@sitocal.com. These terms supplement SITOCAL’s platform Terms & Conditions. The current service is a development alpha; functionality, provider availability and documentation may change. Last updated: 31 October 2026."
      ],
      [
        "Permitted use",
        "Use the checker and explanations for lawful research and business work. Supply only information you are entitled to process. Do not abuse endpoints, evade usage limits, submit unlawful content or interfere with other users. Public explanations do not grant rights to third-party software, articles, brands or data."
      ],
      [
        "Search context and limitations",
        "SERPUM prepares a search URL; Google supplies and controls the results. Country, language and coordinate parameters request a context but cannot guarantee precise location recognition, a stable layout, rankings, indexing, traffic or revenue. The checker does not change your IP address and is not a VPN or certified rank tracker. Verify important observations independently."
      ],
      [
        "Guides and experiments",
        "Reference pages describe workflows, historical experiments and undocumented parameter research. An explanation is not a promise that the corresponding decoder, extension, simulator or historical Google endpoint is available in SITOCAL. Illustrative snippets and hypothetical experiments are labeled; no measured finding should be inferred from an example."
      ],
      [
        "Third-party services",
        "Google, geocoding providers, map services, browser stores and other linked destinations apply their own terms and may change access, quotas or behavior. SITOCAL is not affiliated with or endorsed by Google or the authors of the referenced tools. Preserve third-party attribution rather than relabeling their products as SERPUM."
      ],
      [
        "Availability and responsibility",
        "The public checker is currently provided without a separate checkout. Paid SITOCAL workspaces are governed by the platform’s pricing, payment and refund terms when enabled. Service may be limited for maintenance, safety or provider quotas. Keep your own research records; alpha availability and data accuracy are not guaranteed. Applicable consumer rights are not excluded by this notice."
      ],
      [
        "Changes and contact",
        "Updated terms will be published on this page with a revised date. Contact us about access restrictions, privacy requests or problems. Governing-law, dispute and commercial liability provisions are not invented here; final launch terms require operational and legal review."
      ]
    ],
    "sources": []
  }
];
export const serpumFeatureRoutes=['serpum/features/',...serpumFeatures.map(p=>'serpum/features/'+p.slug+'.html'),...serpumNotices.map(p=>'serpum/'+p.slug)];
