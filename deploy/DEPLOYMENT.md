# Sitocal deployment architecture

2026-10-27 — user confirms ownership of sitocal.com. Ownership is user-confirmed, not DNS-verified. Recommendation: **one Render account/workspace, one paid web service with persistent disk for the private alpha, Cloudflare DNS**. Hosting selection is recommended, not yet explicitly approved/provisioned.

## One account, one initial service

All five hostnames can point to the same Render service. The application chooses the interface by hostname, shares sessions and stores account-owned projects in the same database. A subdomain is an address; it does not require another provider account or server.

| Hostname | Initial destination |
|---|---|
| sitocal.com | Same Render service, landing interface |
| app.sitocal.com | Same Render service, builder interface |
| editor.sitocal.com | Same Render service, editor interface |
| wp.sitocal.com | Same Render service, converter interface |
| serp.sitocal.com | Same Render service, SERP interface |

Separate services can be introduced later in the same account for independently scaled workers or frontends. Do not point five independent SQLite services at separate disks and expect shared accounts/data. A Render disk belongs to one service instance.

## Why Render now

This code uses Node.js 24 built-in SQLite, server sessions and persistent local files. Render supports paid web services with persistent disks. A disk-backed service is limited to one instance and experiences a brief outage during replacement deploys. This is acceptable for a private alpha, not a high-availability promise. Before public paid launch, prefer managed PostgreSQL + object storage + durable background jobs.

Vercel is a viable future frontend/serverless target after persistence/worker adaptation. Its Functions do not supply a shared durable local SQLite filesystem. Netlify Functions also require an adapted serverless entry point and external persistence. Choosing Vercel for the marketing site alone is possible but adds an unnecessary separate deployment at this stage. Generated customer static sites can still deploy to any supported adapter regardless of where Sitocal itself runs.

Sources checked:
- https://render.com/docs/disks
- https://render.com/docs/custom-domains
- https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- https://docs.netlify.com/build/functions/overview/

## Prepared deployment procedure (not executed)

1. Put this code in a private repository. Exclude .env, data/, screenshots and local keys. Root directory is this rankleem folder if using the parent workspace repository.
2. Review Render blueprint costs and disk choice, then create the service from render.yaml or Dockerfile. Add persistent disk at /app/data. Runtime HOST=0.0.0.0; Render supplies PORT. Save a 64-hex-character ENCRYPTION_KEY in Render secrets. Never regenerate it on deploy.
3. Set PUBLIC_ORIGIN=https://app.sitocal.com, COOKIE_DOMAIN=sitocal.com, TRUST_PROXY=true only behind Render's trusted proxy. Keep ALLOWED_HOSTS restricted. Render's generated hostname is accepted via RENDER_EXTERNAL_HOSTNAME for initial checks.
4. Add each of the five custom hostnames to the service in Render. Follow the exact DNS and verification values it supplies. Cloudflare DNS CNAME records for app/editor/wp/serp point at that same service hostname; the apex uses supported flattening/instructions supplied by Render. Do not guess an IP address. Keep unrelated mail/TXT records intact.
5. Establish DNS verification and Render TLS. Start with DNS-only records while validating certificates. If enabling Cloudflare proxy afterward, use Full (strict) TLS. Never use Flexible mode for session traffic. Do not cache /api/*, authenticated HTML, login, editor or preview requests.
6. Register exact Google OAuth callback URI, set Google credentials, enable the three APIs and configure test users/consent.
7. Keep the alpha behind an access gate. The blueprint closes new signups by default. Temporarily permit signups only in the gated private environment to create owner accounts, then close them. No account-creation bootstrapping has been run in Render.
8. Validate login across the four app subdomains, tenant isolation, CSRF, preview iframe isolation, restart persistence, encrypted-token refresh, source push and hosting outcome. Test WordPress imports against actual supported plugin versions.
9. Exercise a consistent DB backup/restore with encryption-key recovery, production migration/rollback, provider action reconciliation and spending controls before exposing real customer data.

Custom-domain counts are plan-dependent and can incur additional charges; review current provider billing. Do not subscribe or create paid resources without the user's concrete authorization.

## Security boundary

The four trusted app subdomains share the sitocal.com cookie domain. They must all be operated by Sitocal and maintained with equivalent security. Do not put untrusted customer sites on that shared parent-domain trust boundary. Generated websites should use customer-owned domains or a separate hosting domain; previews are sandboxed. Account sign-in is not yet a production identity service.

## Still needed to deploy

Chosen Render workspace/repository and access; Cloudflare zone/DNS access; approved service/disk spend; production secrets; completed private-alpha release checks. Domain ownership is confirmed by user. No DNS record or live hosting resource was changed during development.

## Session 013 decision
User selected Render for testing. Initial dummy domain is ppc.pm (Hostinger registrar); Cloudflare DNS. Generic BASE_DOMAIN routing is implemented in 0.1.1. The older sitocal.com examples above are the later production target, not current dummy-domain values. Follow PPC-PM-TEST.md for current exact stages and avoid setting a ppc.pm cookie on the temporary Render hostname.

## Current target — 2026-10-29
SITOCAL and sitocal.com are final. Existing Render service is live and tested on temporary hosts. Earlier provisioning descriptions above are historical. Follow docs/BRAND-DECISION.md for current cutover sequence. Do not replace database/disk/encryption key during rebrand.

