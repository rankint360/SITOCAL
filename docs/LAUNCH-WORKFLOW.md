# Launch a SITOCAL website

1. Create a local business draft. Add real contact details, review metadata in Page readiness and place images with descriptive alt text. Review mobile and desktop previews before saving a revision.
2. Open Publish. Choose the connected source repository and host. Save an HTTPS origin and any per-site destination overrides. Add the custom domain in the hosting provider and follow its DNS instructions. Export or publish again after saving the origin so canonical links and sitemap.xml use it.
3. Review and authorize publication. Netlify and Vercel support status refresh. Provider-ready status is separate from the domain working. Run the HTTPS checks against the saved origin and verify any redirects in your browser. The contact check checks for the form link.
4. Submit a disposable test enquiry through the published contact form. Confirm it arrives in Form Leads. Save the contact check in the launch checklist. Enable email alerts only after verifying the account email and confirming that transactional mail is configured.
5. In Website visibility, connect Google and link the verified Search Console property. Inspect exported URLs, review page issues, and submit the sitemap if the property has write access. Add a tracked keyword with the correct location and device. Daily rank checks use the account's own DataForSEO credentials and the configured daily attempt limits.
6. For calls, export a Ringba Call Details CSV filtered to the correct website tracking number. Include Inbound Call ID, Call Date, Dialed #, Paid Out and Payout. Preview imported daily totals and commit only complete report dates. Imported totals are separate from manual entries.

## Fixture and live verification

The local launch fixture submits a ZIP to a Netlify stub, verifies the provider-ready state, submits a test enquiry, links Search Console, inspects a page and records a DataForSEO rank. The mail fixture verifies one-time links and provider acceptance handling. A local restore drill verified the SQLite snapshot and decryption with a disposable key.

For live testing, use a disposable website, domain, mailbox and provider accounts before opening public signups or charging customers. Confirm production Render health, real checkout and webhooks, WordPress activation and content imports, and verified email delivery. Current verification is local and fixture only. Automatic Ringba synchronization and direct DNS provisioning are pending. The [recovery and backup guide](RECOVERY-AND-BACKUPS.md) covers isolated restore checks.
