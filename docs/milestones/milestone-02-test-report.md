# Milestone 2 test execution report

Date: 2026-10-15 (Africa/Lagos). Execution: local Windows/XAMPP, Node 26.3.1, npm 11.16.0, MariaDB 10.4.32. CI targets Node 24 and MariaDB 11; hosted results are tracked separately.

## Executed checks

Commands use `npm.cmd` in Windows PowerShell. DATABASE_URL was overridden only for migration commands to the dedicated `anajao_identity_m2_test` database; TEST_DATABASE_URL targeted that database for integration and smoke tests. No development/production reset was run. Tests reject database names without `_test` and clean only fixtures identified by their unique run prefix.

| Command                               | Actual result                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                          | Passed: clean lockfile installation, 407 packages installed; zero vulnerabilities reported                             |
| `npm.cmd run db:generate`             | Passed: Prisma Client 7.10.0 generated                                                                                 |
| `npm.cmd run db:deploy`               | Passed: baseline and identity migrations applied to isolated MariaDB                                                   |
| `npm.cmd run typecheck`               | Passed after correcting repository mock return types and validator import typing                                       |
| `npm.cmd run lint`                    | Passed after correcting a smoke-helper template expression                                                             |
| `npm.cmd run format:check`            | Passed: all matched files use Prettier code style                                                                      |
| `npm.cmd run test:unit`               | Passed: 2 files, 20 tests; no skips                                                                                    |
| `npm.cmd run test:integration`        | Passed: 2 files, 16 tests; no skips                                                                                    |
| `npm.cmd run build`                   | Passed: compiled application/tests/tooling                                                                             |
| `npm.cmd run docs:generate`           | Passed: 26 Postman requests, environment and OpenAPI snapshot generated                                                |
| `npm.cmd run docs:validate`           | Passed: OpenAPI specification validation, published Postman Collection v2.1 schema validation, environment JSON parsed |
| `npm.cmd run test:smoke`              | Passed: built application starts, health/readiness/Swagger/OpenAPI return 200, unauthenticated profile returns 401     |
| Dependency audit during clean install | Passed: zero vulnerabilities after scoped dependency overrides                                                         |

## Coverage actually exercised

Unit/HTTP tests cover Argon2id salts and password checks, opaque token generation/digests, JWT signature/claims/expiry rejection, MFA encryption authentication and TOTP, normalized input, weak passwords/privilege injection, environment errors, missing auth, unavailable social provider, unknown refresh, request throttling, generic recovery/logout, malformed/oversized JSON and sanitized infrastructure failures.

MariaDB tests cover pending registration and duplicates, password hash storage, invalid credentials, verification once/expiry/kind mismatch, refresh rotation/family revocation, concurrent refresh serialization, logout/logout-all revocation and idempotency, racing password reset with exactly one winner, reset session invalidation, lockout/expiry/disabled accounts, profile validation, address ownership, customer role denial, phone destination binding, admin MFA enrollment/required code/replay/encryption/session revocation, privacy deduplication/deactivation, provider outage rollback, credential-field omission, cache prevention, expired refresh and timed-lock recovery without bypassing administrative locks. The readiness suite executes a real database query.

## Failures found and resolved during development

- Initial sandbox npm access failed; dependency installation was retried with approved network access. The successful install is separately recorded; failed attempts are not passes.
- Prisma diff from a migrations directory required an unconfigured shadow database. The migration was generated with `--from-empty` because the existing baseline contains no business tables, then applied successfully to a fresh isolated database.
- Typecheck exposed Prisma thenable return types in mocks and CommonJS validator typing; both were fixed and rerun.
- Lint found one template expression narrowed to never; it was fixed and rerun.
- The sandbox could not execute tsx due to Windows user-information access. The documentation generator succeeded with approved execution outside the sandbox.
- Initial audit returned six dependency findings (five high, one moderate) in the inherited Prisma tree. Scoped overrides upgraded mariadb, deepmerge-ts and mysql2; clean installation then reported zero vulnerabilities. No forced major Prisma downgrade was used.

## Not executed / external limits

- Interactive Postman UI/Collection Runner walkthrough was not executed. The collection is schema-validated; equivalent HTTP workflows run in Supertest. Saved responses are illustrative, not recorded executions.
- Live email/SMS/Google/Apple provider end-to-end tests were not run: no verified provider configuration was supplied. Injected delivery success/failure and disabled social boundaries were tested.
- Production/Truehost deployment, TLS/backup drills, formal penetration/load tests and assisted MFA/privacy operational fulfillment were not executed in this milestone.
- No hosted CI result is implied by local passing checks. See the PR handoff for the latest observed remote state.

## Final release verification

After the successful clean `npm.cmd ci`, Prisma generation succeeded again and migration deployment reported no pending migrations. Typecheck, build and lint passed again. Unit tests passed 20/20 in two files and integration tests passed 16/16 in two files without skips. The built-server smoke test again returned health/readiness/Swagger/OpenAPI 200 and anonymous profile 401. Regeneration and schema validation succeeded; `npm.cmd run format:check` passed. `npm.cmd audit --audit-level=high` exited successfully with zero vulnerabilities. Hosted PR/CI observation remains separate and is recorded in the PR handoff.
