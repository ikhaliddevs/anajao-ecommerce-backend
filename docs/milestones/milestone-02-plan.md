# Milestone 2 implementation plan

## Baseline

Milestone 1 PR #1 was merged into `main` at `04b51a8`, while `develop` remained at `ed4307f`. The owner approved fast-forwarding `develop` to `main`. Both now share `04b51a8`; the feature branch is `feature/milestone-02-identity-access`. The owner confirmed `ikhaliddevs/anajao-ecommerce-backend` overrides the example repository in the prompt library. Preserve the pre-existing startup/readiness edits.

## Ordered work

1. Add identity schema and an additive MySQL/MariaDB migration: accounts, roles, sessions, challenges, addresses, MFA and privacy requests, and audit events.
2. Implement password and token primitives, validated configuration, transactional repositories, authentication services and thin HTTP controllers. Use bearer tokens, database-backed revocation, and account-level serialization for security-sensitive changes.
3. Add customer profile/address ownership, verification and recovery provider boundaries, privacy requests, privileged MFA and RBAC. Social login remains unavailable without a verified provider adapter; no external provider is represented as live.
4. Document contracts with OpenAPI and Postman examples/environment; provide setup and operational limitations.
5. Execute static checks, unit/security tests and isolated MariaDB integration tests. Record actual outcomes, including blocked checks.
6. Update AGENTS.md, milestone reports and the Milestone 3 prompt. Commit incrementally, push and open a PR targeting develop. Never merge or start Milestone 3.

## Requirement mapping

The prompt library supplies ID ranges without the underlying PRD text. Mapping is provisional: FR-02-01–06 covers registration, verification, login, recovery, profile/addresses and privacy; FR-08-01–03 covers credential protection, authorization/MFA and abuse/session controls; FR-07-01 covers privileged access and auditability. Exact sub-ID acceptance must be checked against the PRD when available.

## External boundaries

No verified email/SMS/social provider credentials are supplied. Verification/reset delivery uses an injectable provider and fails closed when unavailable; secrets never appear in public responses or logs. Order history/reorder is deferred to M4 because no order data exists. Production Truehost capability checks remain outstanding. Local Node is 26.3.1; CI targets Node 24.
