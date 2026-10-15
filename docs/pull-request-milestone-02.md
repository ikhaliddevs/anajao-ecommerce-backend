# Milestone 2: authentication, identity and access control

Customers can register and verify an account, sign in, rotate/revoke sessions, recover passwords and manage their owned profile/addresses. Admin operations require current role and confirmed TOTP in an MFA-authenticated session. Token replay, concurrent refresh/reset, account status and ownership are enforced transactionally against MariaDB.

## Implementation and migration

- Add layered identity module, Argon2id, short bearer JWTs, hashed rotating refresh/challenge tokens, encrypted MFA factors, privacy requests and security audit events.
- Apply additive `20261015090000_identity_access` migration after backup/review. Supply AUTH_SECRET and MFA_ENCRYPTION_KEY; no public admin seed or role elevation exists. Operator provisioning and rollback constraints are documented.
- Provide OpenAPI, 26-request Postman collection/environment and operating walkthrough. Preserve the existing startup/readiness changes and fix the built npm start path.
- Maintain Prisma 7 with scoped dependency overrides for inherited advisories; CI now validates API artifacts, built server behavior and dependency audit.

## Validation

Locally executed: clean installation, Prisma generation/migration deployment, typecheck, lint, format check, 20 unit tests, 16 isolated MariaDB integration tests, build, API artifact schema validation and five built-server smoke assertions. See [test report](https://github.com/ikhaliddevs/anajao-ecommerce-backend/blob/feature/milestone-02-identity-access/docs/milestones/milestone-02-test-report.md) for final release evidence and explicit not-run checks. No hosted CI pass is claimed until observed.

## Boundaries for review

- Email/SMS is an injectable preparation boundary; social login returns 503 until verified provider integration exists. No public tokens/test delivery sink are exposed.
- Roles use constrained enum values CUSTOMER/ADMIN/SELLER and explicit permission rules; dynamic permission management and marketplace privileges are deferred.
- Privacy DELETE disables/revokes access pending manual fulfillment; it does not certify automatic erasure. Delivery outbox/retries, assisted MFA recovery and shared multi-instance throttling remain operational follow-ups.
- Order history/reorder remains M4. No catalog/checkout/payment/frontend work was added.
- Milestone 1 was merged into main; the owner approved fast-forwarding develop to that baseline before branching.

## Reviewer checklist

- [ ] Review migration/constraints and deployment secrets/key custody.
- [ ] Verify account lifecycle, concurrent refresh/reset, revocation and ownership tests.
- [ ] Verify privileged MFA and trusted admin provisioning; no client-controlled roles.
- [ ] Review provider/privacy/retention boundaries and Truehost follow-ups.
- [ ] Inspect CI evidence and import Postman artifacts.
- [ ] Review AGENTS.md and Milestone 3 prompt. Do not start Milestone 3 until explicitly approved.

## PR status

[PR #2](https://github.com/ikhaliddevs/anajao-ecommerce-backend/pull/2) was created and verified through the authenticated GitHub API because GitHub CLI is unavailable. Base: develop; merged: false. The `checks` job for implementation/handoff commit `05b61d6` was observed completed/success: [CI execution](https://github.com/ikhaliddevs/anajao-ecommerce-backend/actions/runs/38733224819/job/116415912594). Later handoff/tooling commits trigger their own checks. The feature branch is pushed. Wait for owner review and approval; do not merge automatically or begin Milestone 3.

Fallback command if GitHub access is unavailable:

```text
gh pr create --repo ikhaliddevs/anajao-ecommerce-backend --base develop --head feature/milestone-02-identity-access --title "feat: Milestone 2 identity, authentication and access control" --body-file docs/pull-request-milestone-02.md
```

[Compare branch](https://github.com/ikhaliddevs/anajao-ecommerce-backend/compare/develop...feature/milestone-02-identity-access?expand=1)
