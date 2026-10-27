# Continuing Rankleem

Read STATUS.md, README.md, docs/BUILD-REGISTER.md and deploy/DEPLOYMENT.md first. Preserve Rankleem naming and approved Orchard forest/ivory/leaf design. Follow the latest direct user scope over historical MVP deferrals.

This is Node.js 24 ESM with built-in SQLite and no runtime npm dependencies. Run npm run check and npm test for changes. Tests use disposable temporary databases and fixture network responses; never point them at live customer data or provider accounts.

Do not mislabel saved credentials as verified integrations, triggered builds as successful live deployments, or modeled traffic as measured GA4 sessions. Failures are not unranked results. No provider retries after ambiguous writes without reconciliation. Never include .env, data/ or encryption keys in source packages.

End every working session by updating STATUS.md and the build register, including actual changes, tests, outstanding failures, decisions and next action. If working in the original parent workspace, synchronize parent STATUS.md, outputs/STATUS.md and this STATUS.md; synchronize docs/BUILD-REGISTER.md with the original outputs register. npm run package:source produces a clean portable archive after records are current.

Keep the private-alpha/public-production distinction explicit. Domain ownership is user-confirmed; hosting provider recommendation is Render + Cloudflare, not permission to purchase a plan or change DNS. User-authorized publishing integrations are application features; no live provider account was connected by the initial build session.
