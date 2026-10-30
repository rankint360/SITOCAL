# Email and social sign-in — release 0.1.8

Email/password sign-in remains available. Google, GitHub and LinkedIn authorization-code sign-in are implemented, but need OAuth applications and secrets configured in Render before they can be used with real accounts. Live provider sign-in has not been exercised by the agent.

## Configure the existing Render service

Keep the existing disk, encryption key, public origin and registration settings. Add the following environment values directly in Render; do not put secrets in GitHub or chat:

```text
AUTH_ORIGIN=https://app.sitocal.com
AUTH_GOOGLE_CLIENT_ID=YOUR_GOOGLE_LOGIN_CLIENT_ID
AUTH_GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_LOGIN_CLIENT_SECRET
AUTH_GITHUB_CLIENT_ID=YOUR_GITHUB_OAUTH_APP_CLIENT_ID
AUTH_GITHUB_CLIENT_SECRET=YOUR_GITHUB_OAUTH_APP_CLIENT_SECRET
AUTH_LINKEDIN_CLIENT_ID=YOUR_LINKEDIN_APP_CLIENT_ID
AUTH_LINKEDIN_CLIENT_SECRET=YOUR_LINKEDIN_APP_CLIENT_SECRET
COOKIE_DOMAIN=sitocal.com
```

Register the exact callback URLs with their respective providers:

| Provider | Callback |
|---|---|
| Google | `https://app.sitocal.com/api/auth/oauth/google/callback` |
| GitHub | `https://app.sitocal.com/api/auth/oauth/github/callback` |
| LinkedIn | `https://app.sitocal.com/api/auth/oauth/linkedin/callback` |

Google: create a Web application OAuth client with OpenID Connect access to `openid email profile`; configure its consent screen and test users/publishing status as appropriate.

GitHub: register an OAuth App using the callback above. The login flow requests `read:user user:email`, not repository permissions.

LinkedIn: enable **Sign In with LinkedIn using OpenID Connect** in the app's Products settings and request `openid profile email`. Its email and email-verification claims may be absent; creation of a new account requires a verified provider email. Existing users can link a provider from their signed-in account without merging by email.

These `AUTH_*` credentials are separate from the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` used for GSC/GA4 connections. Logging in never creates or overwrites a search/publishing integration. Provider login access/refresh tokens are not retained.

## Account behavior

- Existing email/password accounts and saved websites are preserved.
- Social identities are keyed by provider and immutable subject, not by email alone.
- If a provider returns an email already used by another unlinked account, sign in using that account's existing method, open **Account & sign-in**, and explicitly link the provider. Automatic email-based account merging is refused.
- Linking requires an authenticated session, CSRF protection, browser-bound flow state and the same signed-in account at callback.
- A social-only account can add an email password after a provider sign-in within the last ten minutes. Changing an existing password requires the current password. Other sessions are revoked after a password change.
- `ALLOW_SIGNUPS=false` continues to block new accounts. Existing linked users can sign in. `REGISTRATION_CODE` continues to apply to new social signup; enter the invite before choosing a signup provider. This release does not open public registration.
- Unconfigured provider buttons display **Setup required** and remain disabled. Never interpret them as a validated integration.

## Security and tests

Flows expire after ten minutes, bind to an HTTP-only browser cookie and can be used once. Google/GitHub use S256 PKCE. LinkedIn uses its confidential authorization-code flow with state and OIDC nonce. Google and LinkedIn ID tokens are verified against pinned provider JWKS endpoints with RS256 signature, issuer, audience, authorized party, nonce, expiry and subject checks. Userinfo subjects must match the signed subject. Redirect paths use a fixed allowlist.

Fixture tests cover state/provider/browser binding, replay, signed token substitution, invalid claims, verified email, registration gates, explicit linking and token non-persistence. Email login and the provider-setup UI were checked using a disposable local account. Production OAuth app approval, consent screens and real provider callbacks remain to be validated after merchant/operator configuration.

## Landing-page routing

- `https://serp.sitocal.com/`: public research landing page.
- `https://serp.sitocal.com/serp`: signed-in SERP workspace. Existing workspace navigation now targets this path.
- `https://sitocal.com/google-indexer`: full public Indexer landing page, with SSR title, description, canonical and initial content.
- `https://app.sitocal.com/indexing`: signed-in GSC inspection/sitemap workspace.

Local preview: `/serp-home`, `/google-indexer`, `/login`, `/create-account`, `/account`.

The product pages follow the reference section progression in Sitocal's Fieldwork colors. They distinguish illustrative previews and current connected-provider tools from future payout/coverage and third-party indexing features. No copied testimonials, revenue claims, instant-indexing promises or provider credits are presented as Sitocal results.

References: [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect), [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [LinkedIn OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [SERP design reference](https://serplocal.cc/), [Indexer design reference](https://ranklocal.cc/google-indexer).
