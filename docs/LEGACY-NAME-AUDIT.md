# Sitocal merge and legacy-name audit
2026-10-29. Repository: rankint360/SITOCAL only.

PR1 head5635975 merged into main via merge commit4b2924639c56192967e81a1e61d447fb0152f79d. GitHub reported no other open PRs. Comparing feature-head to merge shows main includes that head plus merge commit: no unmerged feature commits. Two branches exist; retaining the already-merged feature branch does not mean unmerged work.

Public health checks via Node HTTPS returned HTTP200 status ok version0.1.4 on both sitocal.com and sitocal.onrender.com. This confirms deployment version/server health, not authenticated editor/account regression. Main/root, app/editor/wp/serp returned200 and shared Fieldwork entry document; landing.css and primary SVG served200. Authenticated workflow and desktop/mobile visual checks remain pending.

No tracked repository file/folder paths contain Rakleem, Rankleum or Rankleem. Local historical source folder outputs/rankleem and archive rankleem-source.zip retain prior names. No exact Rakleem code typo found. Rankleum remains in old historical documentation/repository URL references; these are not active publish destinations. Main source has Rankleem strings in the following categories:

| Location | Legacy name | Purpose / handling |
|---|---|---|
| lib/store.mjs | rankleem.sqlite | Existing persistent database. Renaming without migration may appear to lose accounts/sites. Keep for now. |
| server.mjs | rankleem_session | Current account cookie. Renaming requires deliberate session transition. |
| lib/sites.mjs, server.mjs | rankleem.json | Static ZIP editable manifest and importer contract. Needs backwards-compatible alias before changing exports. |
| public/app.js | rankleem.json | Visible publishing hint mentions actual manifest filename. Technical legacy exposure remains. |
| public/index.html, public/app.js, server.mjs | rankleem-domain | Internal domain metadata marker. Keep coordinated if renamed. |
| lib/website.mjs, public/app.js | rankleem-edit | Editor iframe message contract. Both sides must change together. |
| lib/ai.mjs | rankleem_site | Internal AI schema name. Non-customer branding. |
| lib/sites.mjs | rankleem WordPress author login/creator | Export metadata; can be renamed as a scoped compatibility cleanup. |
| package.json | name: rankleem | Internal npm package label. No public npm publication. |
| render.yaml | rankleem / rankleem-data | Blueprint resource labels. Do not alter an active disk or service blindly. |
| scripts/package.mjs | rankleem-source.zip | Local source archive output name. |
| tests | rankleem temporary folders/fixtures | Test-only identifiers and compatibility assertions. |
| docs, STATUS.md, deploy/PPC-PM-TEST.md | historical Rankleem/Rankleum references | Historical decisions and obsolete deployment instructions; current AGENTS destination policy supersedes them. |

Visible marketing, headers, footer logos and current product branding are Sitocal. Safe rebranding cleanup is future work; this audit did not reset/migrate database, cookies or imports. Other local-only changes after merge were documentation/checkpoint notes and optional naming-research document, not unmerged app implementation. These are being synchronized to main in this session. Branding/social/preview ZIPs are output deliverables, not runtime source requirements.
