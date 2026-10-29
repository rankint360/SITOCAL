# Sitocal identifier migration — 0.1.5

Current source, filenames, package, cookies, editor messages, domain metadata, AI schema, export manifests and WordPress author identifiers use Sitocal. Local source is outputs/sitocal and the portable archive is sitocal-source.zip. Historical project text has been normalized by user request; Git history has not been rewritten.

On startup, a single prior SQLite database is recognized by its users/sites schema. VACUUM INTO creates a consistent snapshot including committed WAL transactions. Integrity is checked before activation as sitocal.sqlite; the prior file and sidecars are retained under data/migration-backups with neutral backup names. Interrupted migrations resume using brand-migration.json. Ambiguous databases or a missing completed database fail closed. Encryption keys are unchanged. Stop older application processes before migration; concurrent old-version writers are unsupported.

Session tokens from earlier cookie names are checked against the existing session database and transitioned to sitocal_session. Older ZIP manifests are identified by their version/pages structure and passed through the same site validator. New exports use sitocal.json.

Render: keep the existing mounted persistent disk and ENCRYPTION_KEY. Updated blueprint labels describe new installations; do not replace the existing service/disk to match labels. Before rollout, take a provider-level disk backup. To revert to an older binary, stop the service and explicitly restore the matching database filename from the private backup; a forward fix is preferred. Do not deploy an older binary against an empty directory or rotate the encryption key.

Private data and migration backups are excluded from GitHub and source archives. Public deployment verification and authenticated customer checks must be reported separately.
