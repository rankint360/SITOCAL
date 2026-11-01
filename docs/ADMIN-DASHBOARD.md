# SITOCAL administration — 0.5.0
1 November 2026 · Asia/Karachi. Admin UI uses the approved Emerald Studio system.

## Activation on admin.sitocal.com
1. In the existing SITOCAL Render web service, add **admin.sitocal.com** under Custom Domains. Keep the same service and persistent disk; this is not a separate database or hosting account.
2. In Cloudflare, add CNAME **admin** pointing to the hostname Render gives you (normally **sitocal.onrender.com**). Start DNS-only until Render verifies the hostname and provisions its certificate.
3. In Render Environment, add **ADMIN_BOOTSTRAP_CODE** using Generate, with at least 32 random characters. Preserve the existing ENCRYPTION_KEY, DATA_DIR, BASE_DOMAIN, disk and other secrets. ADMIN_ALLOW_PREVIEW stays false.
4. Deploy main. Open https://admin.sitocal.com/. With no administrator yet, the signup form asks for your own admin email, a 12–200 character password and the deployment setup code. Enter these privately in your browser; never put a real password/setup code in source or chat.
5. After first-owner signup, remove ADMIN_BOOTSTRAP_CODE from the environment and redeploy. The administrator and password hash persist on the existing disk. That setup code cannot create additional administrators after the first signup.
6. Additional admins: Owner > Administrators > invite an email and role. Copy the one-time code, deliver it privately yourself, and have the invitee use “I have an admin invitation.” Codes are email-bound, single-use and expire in seven days. No invitation email is sent automatically.

At implementation time admin.sitocal.com returned ENOTFOUND. DNS/custom-domain activation and the first real owner account remain operator steps. No production admin credentials or owner account were created. The Render blueprint now includes a generated bootstrap variable for newly applied blueprints; an existing manually configured service still needs its environment variable added.

Local testing: /admin on localhost. The Render preview hostname can expose /admin only when ADMIN_ALLOW_PREVIEW=true is deliberately configured. The production customer hostname /admin redirects to the admin hostname. Admin API access is rejected on customer hostnames; customer APIs are rejected on the admin hostname.

## Stage 1 — Accounts and access
- Separate administrator table and password signup/login. Customer accounts and customer sessions do not confer administrator rights, even if email addresses match.
- Owner, Support, Billing and Operations roles; server-side role checks on every admin view/action.
- Random hashed admin sessions, host-only HttpOnly SameSite=Strict cookies, __Host- prefix plus Secure over HTTPS. Four-hour session expiry. Same-origin checks, CSRF tokens, login rate limits, and password reauthentication after 15 minutes for changes.
- Own-password change revokes all own admin sessions. Owners invite/disable administrators; disabling yourself or the last active owner is refused.
- Pending/active/hold/suspended/terminated customer states. Non-active states revoke customer sessions and API keys. Restoring access does not resurrect revoked API keys.
- Registration approval is configurable. Existing accounts migrate as active; new email and social registrations follow the policy atomically.
- Per-user allow/deny/inherit rules for builder, editor, WordPress converter, SERP research, indexing, API/MCP, publish and domains. Global tool availability switches and SERPUM maintenance are separate.
- Access checks run on protected APIs, API/MCP authentication and queued indexing work. An already-issued external request cannot be recalled. Public marketing/reference pages remain public; public SERPUM is globally pausable, not individually identifiable after logout.
- Audit records include actor, action, target, reason, safe details and timestamp. The API offers no audit edit/delete action. Lists are bounded to latest records; customer search locates older accounts.

## Stage 2 — Commerce
- Versioned USD monthly plan amounts, saved-site allowances, included-tool flags and Stripe price IDs. Public prices, private billing and enforced allowances read the same active catalog.
- Publishing a new version pins existing subscriptions to their recorded version; existing invoices are not changed and no customer is automatically migrated or charged.
- Enter a matching active Stripe USD monthly price ID when publishing a paid version. It is verified with the merchant API. New price objects are created in Stripe's dashboard; without a matching configured price, checkout for the changed version stays unavailable.
- Expiring/revocable complimentary grants and grants for independently verified manual payments. Grants do not fabricate a paid Stripe subscription. Unique references prevent duplicate grant entries.
- Access codes, percent discounts and fixed USD-cent discounts. Codes have eligible plans, expiry, claim limits and one claim per account.
- Paid discount duration: first invoice, first 1–24 months, or subscription lifetime. Coupons are created lazily with deterministic IDs and idempotency keys, then verified before checkout. A pending/unknown coupon result is read/reconciled rather than blindly recreated.
- Claim reservations and recorded checkout versions survive retries. Existing checkout terms are retained; disabling a code does not invalidate a Stripe checkout link already issued. Confirmed-expired checkouts release reserved claims.
- Billing records show subscriptions and checkouts. An authorized admin can refresh a known provider session/subscription against current Stripe state and recorded terms. Unknown outcomes are not force-cleared, preventing accidental duplicate payments.
- Stripe merchant configuration and signed webhooks are still required. Admin changes do not cancel subscriptions, issue refunds or delete external deployments; those are deliberate separate operations in the Stripe/provider dashboards.

## Stage 3 — Growth and connectors
- Owner/Billing assigns referral codes to customer accounts, with reward plan/duration and reward cap. Customers attach codes in Billing before their first subscription.
- Self-referrals and duplicate attribution are rejected. A bonus grant is awarded once after a positive confirmed paid invoice, not signup or a zero-value invoice. Unique records make repeat webhook deliveries harmless.
- A matching charge.refunded event carrying the qualifying invoice ID revokes that grant. Other dispute/refund shapes require operator review/revocation; this is not a full fraud-detection or payout system.
- Global provider enable/disable controls apply before provider actions, including Google token-backed tools.
- Platform-owned shared keys are allowed only for OpenAI/Claude/Gemini/Grok/Semrush/Ahrefs/SE Ranking/DataForSEO. They are AES-GCM encrypted, write-only in the UI, rotatable/removable and have persisted per-customer/global daily request caps.
- A customer-owned key takes priority over an enabled shared key. Platform limits count a reservation before each shared connection use, including customer verification; failed requests still count. Quotas use UTC days. Request caps are not dollar budgets: also configure budgets with the provider.
- Admin can add/rotate/remove an account-specific credential configuration for existing direct providers, with an audit reason; saved configurations are unverified. Metadata is readable, saved secret values never are. Google linking still requires the customer's OAuth consent.
- Hosting/repository/registrar destinations are not shared between customers. Merchant and OAuth application secrets remain deployment settings.
- Customer Billing supports access-code redemption, referral attribution and viewing owned grants/codes. Integrations distinguishes platform-managed credentials from the customer's own connection.

## Validation and remaining operations
Syntax checks and the full regression suite are required before release. New HTTP coverage exercises bootstrap/invitations, role restrictions, CSRF, account holds/session/key revocation, tool switches, plan publishing, code redemption/limits, referral attribution, encrypted connector metadata, key rotation/removal and password/session revocation. New service fixtures cover shared quota exhaustion/BYOK priority, versioned subscription preservation, grant expiry, promo caps, one-time paid referral reward/reversal, and a three-month discounted checkout with old-price webhook reconciliation. No real Stripe/provider charge or production account mutation was performed.

Browser checked local separate admin sign-in, overview, pricing/version history, customer selection and grant forms. Desktop preview: outputs/admin-dashboard-preview.png. The admin area currently uses password authentication and reauthentication; MFA/SSO, self-service emailed password recovery, tamper-evident external audit storage, advanced referral fraud scoring and automated existing-subscription price migration are future work, not claims of this release.

Official Stripe references checked for the implemented coupon/checkout contract:
https://docs.stripe.com/api/coupons/create
https://docs.stripe.com/api/checkout/sessions/create
