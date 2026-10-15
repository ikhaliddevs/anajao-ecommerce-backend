# Milestone 2 — Identity and access

Date: 2026-10-15 (Africa/Lagos). Branch: `feature/milestone-02-identity-access`.

## Baseline and authorization

Milestone 1 was merged through PR #1 into main at `04b51a8`. The owner approved fast-forwarding develop to that commit; origin/develop was updated without force-pushing. The feature branch shares that baseline. The owner confirmed `ikhaliddevs/anajao-ecommerce-backend` supersedes the example owner in the supplied prompt library. Existing startup/readiness changes were preserved and included.

## Delivered behavior

- Customer registration with normalized unique emails, Argon2id credentials and pending verification. Duplicate registration returns the same acknowledgment and cannot inject a role.
- Verified-account login; active/pending/disabled/locked lifecycle; IP throttling plus transactional account lockout. Five failed password/MFA attempts revoke sessions and impose a timed lock. Password recovery can clear timed locks, while administrative locks remain enforced.
- Short HS256 access JWTs with issuer/audience/type/expiry validation, opaque hashed refresh tokens, absolute session-family expiry, rotation, replay-family revocation, idempotent logout and logout-all. Access is checked against the current account and session in MariaDB.
- Single-use hashed email/phone/recovery challenges, expiry, destination binding and password-reset session invalidation. Email/SMS delivery uses an injectable preparation boundary; unavailable delivery never discloses account existence or raw tokens.
- CUSTOMER/ADMIN/SELLER role boundaries, current-role checks and admin TOTP enforcement. Enrollment reauthenticates the password; confirmed factors are encrypted using AES-256-GCM, accepted steps cannot be replayed, and confirmation invalidates existing sessions.
- Owned profile/name/phone updates, bounded saved-address list/create/delete, deduplicated pending privacy requests and immediate disable/session revocation on deletion requests pending manual fulfillment.
- Transactional security audit events, request/driver log sanitization, secret validation, explicit CORS and bearer-only transport.
- OpenAPI 3.1 contracts and `/api-docs.json`, Swagger UI, generated Postman v2.1 collection with 26 requests, empty-secret environment, schema validation and manual walkthrough.
- Expanded CI with isolated database integration tests, built server smoke checks, API artifact validation and dependency audit. Scoped transitive overrides eliminate the advisories found in the initial Prisma tree.

## Requirements and scope interpretation

The library supplies FR-02-01–06, FR-08-01–03 and FR-07-01 without the underlying PRD definitions. The provisional mapping in [the implementation plan](milestone-02-plan.md) groups authentication/verification/recovery/account/privacy under FR-02, credential/session/MFA controls under FR-08, and privileged access/audit under FR-07-01. Exact sub-ID compliance awaits the PRD; no missing acceptance wording has been invented.

Role values are constrained enums and permissions are explicit middleware/service rules. Dynamic role/permission tables are deferred until configurable permissions are required. SELLER is the vendor-ready role. No seller marketplace privileges are granted. Social endpoints remain unavailable until a verified Google/Apple integration exists. Email/SMS is preparation only, as described in the milestone-specific prompt. No order model exists, so order history/reorder moves to M4.

## Changed files and schema

- `src/modules/identity/`: validation, cryptographic primitives, repository/transaction boundary, service, providers, authentication/RBAC middleware, controllers, routes and OpenAPI contracts.
- `prisma/schema.prisma`, `prisma/migrations/20261015090000_identity_access/migration.sql`: additive User, Session, Challenge, Address, MfaFactor, PrivacyRequest and AuditEvent tables, unique constraints, indexed lookups and foreign keys. Existing health APIs remain compatible.
- `src/app.ts`, `src/config/env.ts`, `src/config/openapi.ts`, `src/database/client.ts`, `src/logger.ts`, `src/server.ts`, `src/common/middleware/error-handler.ts`: composition, injected database configuration, validated secrets, sanitized logs/errors, JSON errors and documentation routes.
- `tests/identity.test.ts`, `tests/integration/identity.test.ts`, `tests/helpers.ts`, `tests/integration/database-readiness.test.ts`: security, HTTP, concurrency and isolated MariaDB coverage.
- `scripts/generate-postman.ts`, `scripts/validate-api-artifacts.ts`, `scripts/smoke-built.ts`, `scripts/open-milestone-pr.ts`: generation, schema validation, built server verification and authenticated PR handoff without printing credentials.
- `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example`, `.github/workflows/ci.yml`: dependencies/overrides, correct built entry point, scripts and CI.
- `AGENTS.md`, `docs/setup.md`, `docs/identity-access.md`, `docs/openapi.json`, both Milestone 2 reports/plan, `docs/pull-request-milestone-02.md`, the supplied prompt library, the generated Milestone 3 prompt and both Postman artifacts: operating instructions and review handoff.

## Validation and acceptance

See [the test execution report](milestone-02-test-report.md) for actual commands, results and limitations. Local verification includes MariaDB migrations, 20 unit tests, 16 integration tests, static checks, build, five built-server smoke assertions and API schema validation. No test is counted as passed because it was planned or skipped. Hosted CI/PR status is tracked in [the PR handoff](../pull-request-milestone-02.md).

Acceptance: locally verified identity/account foundation, ready for owner review. Production/external integrations are not certified complete. Milestone 3 implementation is not authorized and has not begun; only its requested prompt is generated.

## Deployment and unresolved risks

- Set independent random AUTH_SECRET and MFA_ENCRYPTION_KEY before starting outside tests. Provision least-privilege database credentials, TLS, backups and key custody; verify Truehost capabilities separately. Local MariaDB 10.4.32 and Node 26.3.1 differ from CI MariaDB 11 and Node 24.
- Apply the additive migration after backup/review. Application rollback leaves the new tables in place; do not drop identity/audit data as an automatic rollback.
- Live email/SMS/social provider integration, delivery retries/outbox, assisted MFA recovery and privacy-request fulfillment remain documented boundaries. Delivery occurs within a bounded database transaction; a provider send followed by commit failure may require a fresh challenge.
- IP throttles are per process. Add a shared limiter store before multi-instance deployment. Token/client storage, TLS and proxy topology require deployment review.
- Establish audit/token retention cleanup and privacy handling policies. Retain revoked refresh rows at least until family expiry so replay detection works. Do not remove rows needed for replay detection early.
- Review and eventually remove transitive overrides when Prisma's pins are patched; keep generation/migration/integration checks around updates.
