# Design systems — five proposals
2026-10-27. These are SaaS control-panel directions; customer-site templates are a separate design task. Product descriptor is temporary.

| Direction | Background | Surface | Text | Accent | Secondary text | Typography / geometry | Best fit |
|---|---|---|---|---|---|---|---|
| Harbor | #F4F7FB | #FFFFFF | #14243C | #2358D5 | #53657E | Inter/Segoe UI; 12px panels; sidebar + summary grid | Recommended balanced agency workspace |
| Midnight | #10151E | #1A2230 | #F0F4FC | #A8E55F | #ACB8CD | Inter/Segoe UI; 5–6px panels; compact data table | SEO operators who prioritize SERP data |
| Terracotta | #FAF6F0 | #FFFDFA | #342C27 | #A74429 | #756357 | Georgia headlines; Segoe UI body; guided wizard | Approachable business-owner onboarding |
| Orchard | #F1F7F4 | #FFFFFF | #183D32 | #176B50 | #506E63 | Inter/Segoe UI; generous spacing; portfolio cards | Managing many client websites |
| Prism | #F6F4FD | #FFFFFF | #29203F | #7041C3 | #6D6182 | Inter/Segoe UI; 12–24px panels; task checklist | Guided creation and publishing |

Shared proposal: 4/8/12/16/24/32/48px spacing; 14–16px body; 28–32px desktop screen titles; 44px minimum touch targets; labeled fields; visible keyboard focus; semantic error text; tabular numerals in rank tables. Accent is for primary actions and active states. Success/warning/error also use explicit labels. Final implementation must verify contrast for actual foreground/background pairings and all interaction states.

Previews use installed Segoe UI with fallbacks and no external assets. Sidebar reflows away on small screens in these concept samples; production requires an accessible mobile navigation control. Buttons select a concept locally and display its name; communicate the choice in chat to record it. No selection is sent to a server or saved as a product decision automatically.

Recommendation: Harbor for the control panel, with Midnight-inspired SERP table density. Choose one base direction before combining ideas. The sample numbers, business names and charts are illustrative, not research results.

## Selected direction — session 002
User selected Orchard. Refined proposal: deep forest #123F31, leaf accent #D6EEA2, ivory surface #FFFEFA, sage background #F3F6EF, green action #196747, text #183C30 and secondary #5C7065. Georgia display headlines with Segoe UI interface text. Forest hero, restrained curves, warm site miniatures and clearer publishing states. Responsive navigation remains visible on mobile. Current source: orchard-refined.html. Final visual approval pending; original recommendations above are historical.

Session 003: User approved refined Orchard. This supersedes the pending visual approval note above. Naming is the current stage.

Session 008: Product name Sitocal selected. Approved Orchard concept now displays Sitocal. BRAND-DECISION.md is the current naming source of truth.
