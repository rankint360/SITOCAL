# SITOCAL recovery, email and backup operations

## Transactional email

Set RESEND_API_KEY and SITOCAL_MAIL_FROM in Render secrets. The sender must be authorized by the Resend account. Leave the key unset to keep mail delivery disabled. Customers opt in after verifying their sign-in email. Lead notifications contain a link to the private inbox, with no visitor data in the message.

Verification and reset links expire in 30 minutes. Open verification links while signed in as the account that requested them. Password reset revokes customer sessions and API keys. Test with a disposable account and mailbox before enabling on a public service.

The worker stores encrypted queued payloads and a bounded delivery history. Accepted records show provider acceptance. Unknown sends need investigation and are not retried automatically. Do not disclose queue payloads or credentials in support tickets.

## SQLite backup and restore drill

Run node scripts/backup.mjs create /app/data/sitocal.sqlite /secure/backup/new-snapshot.sqlite from a trusted operator shell. The tool reserves a new destination and performs an online SQLite backup, then checks integrity and the expected schema. Store snapshots in encrypted private backup storage and retain the existing encryption key separately in your secret manager. Do not add snapshots to GitHub.

Run node scripts/backup.mjs verify /secure/backup/new-snapshot.sqlite on the restored copy. For a drill, copy it into an isolated staging data directory as sitocal.sqlite, use the original encryption key, and start a separate service with SITOCAL_DISABLE_WORKERS=true, outbound networking blocked and production sender and checkout secrets unset. Check sign-in, saved projects, revisions, and the ability to decrypt a fixture connection. Never point a restore drill at the production disk. Production restore and traffic cutover require an operator-approved maintenance plan.
