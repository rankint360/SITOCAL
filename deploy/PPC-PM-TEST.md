# Guided private test deployment — ppc.pm

Selected by user, 2026-10-27: Render for testing; ppc.pm registered with Hostinger; Cloudflare will manage DNS. GitHub, Render and Cloudflare accounts ready. No credentials shared. No hosting service or DNS records have been changed by Codex.

Use small checkpoints. Do not switch nameservers before checking existing mail/website records. Do not enable live paid integration actions until the offline site flow passes. This is an alpha, not a public SaaS release.

## Checkpoint 1 — code in a private GitHub repository

Download the latest rankleem-source.zip from this chat and extract it. Create a private GitHub repository named rankleem-test (or choose your own name). Upload the extracted contents so package.json, server.mjs, Dockerfile, public/ and lib/ are at the repository root. Upload the files, not the ZIP. The source archive excludes runtime databases and secrets; do not upload an old local data/ directory or .env file.

Checkpoint: open the repository and confirm Dockerfile and package.json appear at the top level. Record repository URL in the register when the user shares it.

## Checkpoint 2 — deploy on Render's temporary hostname

Create New → Web Service and connect that private repository. Use Docker runtime with Dockerfile at the repository root. Select one small paid web instance; persistent disk is required. Add a 1GB disk mounted at /app/data. Render supplies the PORT; the application reads it. Set:

| Setting | Initial Render-only value |
|---|---|
| HOST | 0.0.0.0 |
| TRUST_PROXY | true |
| ALLOW_SIGNUPS | true during invite-only test signup |
| REGISTRATION_CODE | Long secret chosen by you, entered only in Render settings |
| ENCRYPTION_KEY | 64 random hex characters, generated privately |
| BASE_DOMAIN | Leave unset initially |
| COOKIE_DOMAIN | Leave unset initially |
| PUBLIC_ORIGIN | Leave unset initially; server derives HTTPS Render hostname |

Do not add empty placeholder secrets to the repository. Keep Google credentials unset for the first check. Use a locally run Node command to generate the encryption key: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Save its output privately in Render and a secure backup; never paste it into chat. Keep this key stable across deploys.

Set health-check path /api/health. Deploy, then open the assigned https://YOUR-SERVICE.onrender.com/api/health. Expected JSON status ok and version 0.1.1. Review build/runtime logs if it does not start. Docker was not locally build-tested because Docker is unavailable in the development environment. In particular confirm /app/data is writable and restart persistence works before proceeding.

Checkpoint: temporary landing, signup with invite code, sign-in, template website creation, editor, revision save, ZIP download, converter downloads. After creating owner/tester accounts, set ALLOW_SIGNUPS=false and redeploy; login remains available. Do not use a shared example password.

## Checkpoint 3 — delegate ppc.pm DNS to Cloudflare

In Cloudflare, add ppc.pm using the Free plan. Review imported records; copy missing mail MX/TXT/SPF/DKIM records if this domain is used for email. Cloudflare gives two assigned nameservers. At Hostinger, open domain ppc.pm → DNS / nameservers and change only the nameserver delegation to those exact values. The domain stays registered with Hostinger. Handle existing DNSSEC/DS settings according to Cloudflare's onboarding instructions before the nameserver switch; do not leave a stale DS record.

Wait until Cloudflare marks the zone Active. No guessed nameserver values and no nameserver transfer to Render.

## Checkpoint 4 — attach the five test hostnames

Add each custom domain to the same Render service:

- ppc.pm
- app.ppc.pm
- editor.ppc.pm
- wp.ppc.pm
- serp.ppc.pm

In Cloudflare create the exact CNAME/verification records Render supplies. The target is the actual Render service hostname, not an invented IP. Start DNS-only while checking Render's ownership verification and TLS. Keep unrelated records. Render may add www automatically for the apex. Review extra-domain charges in the dashboard.

After verification, change Render environment values together:

| Setting | Value |
|---|---|
| BASE_DOMAIN | ppc.pm |
| PUBLIC_ORIGIN | https://app.ppc.pm |
| COOKIE_DOMAIN | ppc.pm |
| GOOGLE_REDIRECT_URI | https://app.ppc.pm/api/google/callback (when enabling Google) |

Keep TRUST_PROXY=true, HOST=0.0.0.0 and the same encryption key. BASE_DOMAIN adds the six root/www/app/editor/wp/serp allowed hostnames. Do not set these cookie settings during temporary Render-only sign-in: a ppc.pm cookie cannot sign you into onrender.com. After cutover, sign in on app.ppc.pm; sessions issued for the temporary hostname do not transfer.

Checkpoint: root opens landing; each subdomain opens its correct interface; switching builder/editor/converter/SERP preserves the signed-in account; export and revision data survive a Render restart. If enabling Cloudflare proxy, use Full (strict) TLS, and never cache authenticated pages or /api routes.

## Checkpoint 5 — verify optional integrations separately

1. Download and inspect the offline site ZIP; import it back into Rankleem.
2. Test Elementor, Gutenberg/WXR and Divi4-beta exports on a disposable WordPress installation. Divi5 native export remains unimplemented.
3. Configure OpenAI with your own API key/model; run one small draft and review token usage/content. Paid usage separate from Render.
4. Connect an initialized test repository and push one generated website. Never target an important existing site during initial QA.
5. Connect one deployment target, submit a test build, then verify its final state in the hosting dashboard; Rankleem submission is not proof that it is live.
6. Add DataForSEO credentials and run a single rank check for one domain, one keyword, one supported location/device. Review provider costs and competitors. Then test demand/traffic/backlinks separately; traffic estimates are not GA4 sessions.
7. Configure Google Cloud consent/test users, OAuth client and exact callback URI; enable Search Console, Analytics Admin and Analytics Data APIs. Link accessible properties and compare a small report with Google's UI. Persistent project/property binding and analytics-tag insertion remain pending.
8. Test registrar availability lookup with an eligible Cloudflare Registrar account. No domain purchase action exists.

Record real pass/fail results rather than assuming adapters are certified. Keep invite-only access and test data until production gaps listed in README.md are addressed.

## References

- https://render.com/docs/deploys
- https://render.com/docs/configure-environment-variables
- https://render.com/docs/custom-domains
- https://render.com/docs/disks
- https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
- https://www.hostinger.com/support/1696789-how-to-change-nameservers-at-hostinger/
