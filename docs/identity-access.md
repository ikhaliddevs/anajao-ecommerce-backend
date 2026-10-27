# Identity and access (Milestone 2)

## Setup and configuration

Use Node 24 LTS. Run `npm ci`, `npm run db:generate`, `npm run db:deploy`, then `npm start` after `npm run build`. The build entry point is `dist/src/server.js`.

Set `AUTH_SECRET` to at least 64 cryptographically random characters and `MFA_ENCRYPTION_KEY` to 32 random bytes encoded as 64 hex characters. Generate each independently using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never commit them. Retain the MFA encryption key securely; changing it without re-encrypting factors prevents MFA login. Changing the signing secret invalidates access JWTs; revoke sessions as well when responding to compromise. Missing/invalid secrets fail startup outside tests. `.env.example` contains intentionally nonfunctional placeholders.

Access tokens default to 600 seconds (60–900 configurable); refresh families have an absolute seven-day lifetime (up to 30 days configurable). Refresh does not extend that lifetime. Tokens are returned in JSON for a bearer client. Clients must protect tokens and serialize refresh requests; never place tokens in URLs or logs. Refresh revokes the old access token immediately. Concurrent refresh/reuse triggers family revocation and requires a fresh login.

No auth cookies are set or accepted. CORS allows explicit environment origins with credentials disabled. Bearer headers are not automatically attached by browsers, so cookie-based CSRF is not part of this contract. Use TLS, protect against XSS, and keep tokens out of persistent browser storage when possible. Do not enable proxy trust without validating the deployment topology. Current IP limits are per-process; a shared store is required before multiple application instances. Five failed password/MFA attempts lock the account for 15 minutes and revoke all sessions. A subsequent login after expiry unlocks timed locks. Administrative locks with no expiry remain locked.

## Delivery and social provider boundaries

Delivery defaults to disabled. Set `EMAIL_PROVIDER=gmail` with the credentials below to enable Gmail SMTP email verification and password recovery. SMS remains unavailable. Registration creates a pending customer and returns the same 202 envelope for duplicates. Invoke resend-verification to request delivery. Pending accounts cannot log in. Tests can override delivery via `createApp({ challengeDelivery })`; the in-memory test sink is never exposed as a public endpoint.

### Gmail SMTP setup

Enable Google 2-Step Verification and create a dedicated [app password](https://support.google.com/accounts/answer/185833). Use that app password, not your normal Google password. Some managed accounts or security configurations do not permit app passwords.

Add these values to your local, ignored `.env` and restart the server:

```dotenv
EMAIL_PROVIDER=gmail
GMAIL_USER=your-account@gmail.com
GMAIL_APP_PASSWORD=your-16-letter-app-password
```

Replace the example values; spaces in Google's displayed app password are removed automatically. The sender is the authenticated Gmail account. The adapter uses `smtp.gmail.com:465` with TLS certificate verification, disabled SMTP logging, and a six-second delivery deadline within the existing ten-second transaction. No credentials or raw provider errors are logged. Phone verification still requires a separate SMS adapter. See [Nodemailer's SMTP configuration](https://nodemailer.com/smtp).

To test in Postman, register your receiving email address, then POST `/api/v1/auth/email/resend-verification` with `{"email":"your-receiving-address@example.com"}`. Copy the token from the received email into `challengeToken`, then POST `/api/v1/auth/email/verify` with `{"token":"{{challengeToken}}"}`. You can now log in. Registration itself does not send mail. Password recovery uses `/api/v1/auth/password/forgot` and sends a separate reset token.

A `202` response remains a generic acknowledgment, not proof of delivery. Check your inbox/spam folder and local credentials if no email arrives. SMTP can finish after the application deadline, or accept a message before a later transaction failure; such emails contain unusable tokens because the challenge was rolled back. Request a fresh token in that case. Automated tests mock SMTP; actual Gmail authentication and inbox delivery must be checked with your configured account. Do not share or commit app passwords. Gmail acceptance does not guarantee inbox placement, and Gmail account sending limits still apply.

The provider receives a destination, challenge kind, raw secret and expiry. It must keep secrets out of logs, use bounded delivery timeouts (within the 10-second transaction budget) and send via a verified service. Only a SHA-256 digest is stored. The database transaction invalidates previous challenges of the same kind, creates the new one and calls the provider before committing. Delivery failures roll back and return the same generic 202 response as unknown accounts. A provider may send a message before a later commit failure; clients must be able to request a fresh challenge. A transactional encrypted outbox with retries is future work before live delivery at scale.

Email and phone challenges expire after 24 hours; password resets expire after 30 minutes. Tokens are 32 random bytes in base64url, consumed once under an account-row lock and bound to their destination. A phone change invalidates old phone challenges and clears verification. Password reset revokes every session and clears timed lockouts, but does not bypass administrative locks, disabled status, MFA or email verification. Public requests use non-enumerating envelopes; timing equalization is best-effort, not guaranteed.

`POST /api/v1/auth/social/{provider}` returns 503 `PROVIDER_UNAVAILABLE`. Google/Apple login is deliberately unavailable until issuer/audience/signature/expiry/nonce/verified-email validation and linking policy are implemented and tested against verified provider configuration. The `SocialIdentityProvider` interface documents that boundary; no credentials imply a working integration.

## Roles and privileged access

| Role     | Allowed scope                                                                              |
| -------- | ------------------------------------------------------------------------------------------ |
| CUSTOMER | Own account, phone, addresses and privacy requests                                         |
| SELLER   | Same owned account scope; reserved vendor role, no marketplace privileges yet              |
| ADMIN    | Own account plus privileged access check with confirmed TOTP and MFA-authenticated session |

Roles are a constrained database enum, not client-supplied values. There is no public role-management endpoint or implicit admin seed. Static middleware permissions express the current scope; configurable roles/permission tables are deferred until the scope needs them. `authorize` is reusable for feature routes; privileged services must also recheck current role and session in the same account transaction as their action.

Provision the first admin through a trusted database operator after independently verifying the account email. Update only that account's role to ADMIN and revoke existing sessions in the same transaction. Do not grant roles based on registration input. Then:

1. Log in with the verified account and password. Before MFA enrollment this session only permits account/enrollment operations; `/admin/access-check` returns 403.
2. POST `/auth/mfa/setup` with the current password. Securely import the returned `otpauth` URI in an authenticator. The secret is intentionally returned only during enrollment and encrypted using AES-256-GCM at rest.
3. POST `/auth/mfa/confirm` with `{ "code": "123456" }`. Confirmation revokes all sessions.
4. Wait for a fresh TOTP step, then log in with `mfaCode`. Privileged operations now work. The accepted step is tracked transactionally to reject code replay. There are no public MFA reset/recovery endpoints; assisted recovery requires an authenticated operator procedure and session revocation.

Audit events contain user ID, action and time, without raw credentials/tokens. The API never returns internal hashes or encrypted factors. Driver exceptions and request URLs/bodies are not logged. Retention/archival, encrypted backups and assisted recovery are production operational decisions still required.

## Account and privacy behavior

GET/PATCH `/api/v1/me` reads/updates name and phone. Email and roles cannot be changed through profile input. Address list/create/delete always use authenticated ownership. Addresses are bounded at 100 per account and returned newest first, so there is no unbounded query or pagination contract at this milestone.

POST `/me/privacy-requests` accepts EXPORT or DELETE. Repeated pending EXPORT requests return the same request. DELETE immediately disables the account and revokes all sessions while retaining the request for manual review. This is a request workflow, not completed data erasure/export. Operators must establish a retention and fulfillment policy; audit foreign keys intentionally prevent unaudited physical deletion. Do not claim compliance certification or automatic GDPR fulfillment.

No order tables exist; history and reorder are deferred to M4. No catalog, cart, payment, marketplace, frontend or mobile features are implemented.

## Postman walkthrough

Import `postman/anajao-milestone-02.postman_collection.json` (v2.1) and `postman/anajao-milestone-02.postman_environment.json`. Select the environment; set email and a unique password of 15–128 characters. Secrets in the example environment are empty. Saved responses are illustrative examples, not execution evidence. Regenerate artifacts using `npm run docs:generate`, then format them.

1. Register, request email verification, copy the token from your verified test delivery sink to `challengeToken`, and verify. Without a delivery adapter these requests return generic acknowledgments but no messages are sent.
2. Login; assertions save `accessToken` and `refreshToken`. GET `/me` and PATCH the profile. Never export an environment containing real tokens/passwords.
3. Create/list/delete an address; creation saves `addressId`. Use a separate account token to check ownership denial.
4. Refresh exactly once; assertions replace the pair. Replay the previous refresh token to test family revocation, then sign in again.
5. Request recovery, copy its secret into `challengeToken`, set `newPassword`, reset, and check old sessions fail. Update your password variable before login.
6. Set a phone, request phone verification, copy the delivered phone token and verify. Use the admin procedure above for MFA and the positive admin access check; customer tokens should produce 403.
7. Exercise EXPORT privacy requests, logout/logout-all and the negative examples. DELETE privacy requests require a new account for subsequent tests.

Requests have status/envelope/secret-field assertions and token/address capture scripts. Choose requests in the sequence above; running the entire collection linearly will intentionally fail prerequisites (particularly MFA/admin checks, social unavailability, challenge tokens, and requests after logout). Automated HTTP assertions are executed independently in Vitest/Supertest.

## Isolated integration database

Never point integration tests at development or production. Create a dedicated MariaDB database whose name ends in `_test` and grant a dedicated test user only that database. Set `DATABASE_URL` to it when deploying migrations, then `TEST_DATABASE_URL` for tests. On PowerShell use `npm.cmd`. CI creates its own MariaDB service and sets both URLs.

```text
npm run db:generate
npm run db:deploy
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run build
```

Integration suites skip if TEST_DATABASE_URL is missing; a skipped suite is not a pass. They reject database names without `_test`. Fixtures have a unique run prefix and cleanup touches only their IDs, including audit events before dependent accounts. SQL schema migration is additive; production rollout requires a backup and deployment migration review. Rolling the application back leaves the new tables intact; destructive table removal requires a separately reviewed migration. No reset is needed.

## Security references and dependency overrides

Argon2id uses 19 MiB, two passes and one lane, following [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Refresh replay detection follows the rotation principle in [RFC 9700 §4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).

Prisma 7.10.0 pins vulnerable transitive libraries. Scoped npm overrides use mariadb 3.5.4, deepmerge-ts 8.0.2 and mysql2 3.24.6; revisit when Prisma updates its pins. See [MariaDB advisory](https://github.com/advisories/GHSA-cx2f-j9fh-8g68), [deepmerge advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), and [mysql2 advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3). Compatibility must be verified by Prisma generation, migration deployment and database tests; an audit alone does not establish application safety.
