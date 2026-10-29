# Sitocal — final brand decision

Confirmed by user: 2026-10-29. Final product brand: **SITOCAL**, displayed as **Sitocal** in interface copy. User confirms purchasing **sitocal.com** and reports IPO-Pakistan search found no related trademarks. These are user-confirmed facts, not independent legal clearance. Launch: Pakistan first, selected global markets later.

This supersedes Rankleem and all provisional naming shortlists. Voomark remains historical. Keep approved refined Orchard forest/ivory/leaf design. No Harbor redesign approved. Current lettermark is a provisional lowercase s, not a finished logo.

Host plan: sitocal.com (landing), app.sitocal.com (builder), editor.sitocal.com (editor), wp.sitocal.com (WordPress converter), serp.sitocal.com (search). Existing Render service/repository can continue unchanged; do not create a second service/database just for the brand.

Compatibility: source folder outputs/rankleem, package name, rankleem.sqlite database, rankleem_session cookie, rankleem.json ZIP manifest, editor message identifier and domain meta identifier remain stable deliberately. Do not rename persistent storage or secrets casually: that can hide existing accounts/projects or break imports. Visible UI/export copy uses Sitocal. Existing repository anjam775/Rankleum and onrender hostname remain unchanged.

DNS cutover is pending. Add/verify all six new hostnames on the same Render service and provision TLS first. Preserve disk and ENCRYPTION_KEY. After verification set BASE_DOMAIN=sitocal.com, PUBLIC_ORIGIN=https://app.sitocal.com, COOKIE_DOMAIN=sitocal.com together. Users sign in again on new domain. Old ppc.pm session cookies cannot transfer. Keep a private copy of old settings for rollback. Google callback will be https://app.sitocal.com/api/google/callback when enabled. No DNS, registrar, hosting environment or OAuth changes made by this branding session.
