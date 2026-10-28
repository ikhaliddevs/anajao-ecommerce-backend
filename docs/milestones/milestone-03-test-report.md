# Milestone 3 test execution report

Execution dates: 2026-10-27 and 2026-10-28 (Africa/Lagos). Local environment: Windows/XAMPP, Node 26.3.1, npm 11.16.0, MariaDB 10.4.32. CI targets Node 24 and MariaDB 11. Hosted status is tracked in `docs/pull-request-milestone-03.md`; local results do not imply a hosted CI pass.

## Executed commands and results

| Command                                                                                                                                               | Actual result                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd ci`                                                                                                                                          | Passed: 409 packages installed from the existing lockfile                                                                                       |
| `npm.cmd run db:generate`                                                                                                                             | Passed after retrying with engine-cache permission; Prisma Client 7.10.0 generated                                                              |
| `node node_modules/prisma/build/index.js migrate diff --from-schema node_modules/.cache/m3/baseline.prisma --to-schema prisma/schema.prisma --script` | Passed with cache access; additive SQL generated, then reviewed and augmented with lock seed/CHECK constraints                                  |
| `node node_modules/prisma/build/index.js migrate deploy`                                                                                              | Passed with DATABASE_URL overridden in the child process to the dedicated `_test` URL; all three migrations applied to `anajao_catalog_m3_test` |
| `npm.cmd run typecheck`                                                                                                                               | Passed                                                                                                                                          |
| `npm.cmd run lint`                                                                                                                                    | Passed after fixing CSV control-regex lint and schema tuple typing                                                                              |
| `npm.cmd run format:check`                                                                                                                            | Passed after formatting generated files and normalizing local checkout line endings                                                             |
| `npm.cmd run test:unit`                                                                                                                               | Passed: 4 files, 34 tests, no skips                                                                                                             |
| `node --env-file=.env.m3-test node_modules/vitest/vitest.mjs run tests/integration`                                                                   | Passed 2026-10-28: 3 files, 27 tests, no skips                                                                                                  |
| `node --env-file=.env.m3-test node_modules/vitest/vitest.mjs run`                                                                                     | Passed during implementation: 7 files, 61 tests, no skips; rerun after strengthening the distinct-admin stock race and response schemas         |
| `npm.cmd run build`                                                                                                                                   | Passed                                                                                                                                          |
| `npm.cmd run docs:generate`                                                                                                                           | Passed with Windows user-info access: generated M2 artifacts/OpenAPI plus 37 M3 Postman requests and matching environment                       |
| `npm.cmd run docs:validate`                                                                                                                           | Passed with public Postman schema access: OpenAPI and both Postman v2.1 collections validated; both environments parsed                         |
| `node --env-file=.env.m3-test dist/scripts/smoke-built.js`                                                                                            | Passed: 9 built-server health/readiness/Swagger/OpenAPI/catalogue/content/auth assertions                                                       |
| `npm.cmd audit --audit-level=high`                                                                                                                    | Passed: zero vulnerabilities                                                                                                                    |

`npm.cmd run test:integration` is the CI script. Locally use the direct Vitest command above to reliably load the ignored test URL. An attempted `node --env-file=.env.m3-test --run test:integration` skipped all 27 tests because the spawned test process did not receive TEST_DATABASE_URL; that attempt is **not a pass**. The subsequent direct command executed all 27 successfully.

## Isolation and migration safety

Test URL lives only in ignored `.env.m3-test`; it is never printed or committed. Integration suites reject database names not ending `_test` and never fall back to DATABASE_URL. Fixtures use per-run UUID prefixes; cleanup deletes only their users/catalogue records and related audit/ledger/batch records. Existing identity integration tests ran alongside catalogue tests. No development/production database reset or new migration deployment occurred.

The dedicated database was created successfully, but XAMPP returned `ER_NOT_KEYFILE` when provisioning a least-privilege test user. Local verification used the existing XAMPP root account against only `anajao_catalog_m3_test`. This is a local setup limitation, not a production credential pattern. CI uses its isolated database and dedicated user. Repair account provisioning separately; system tables were not repaired or overwritten.

## Coverage actually exercised

- Unit: SKU/option normalization; rejecting client stock/privilege fields; sale-window/tier/preorder/URL validation; pagination/search limits; inclusive start/exclusive end pricing; approved-only wholesale calculation and stock policy; CSV quoted fields/newlines, malformed data, row limits, formula rejection and spreadsheet-safe export.
- Database/HTTP: public draft visibility and private-field omissions; HTTP validation; category cycles/in-use deletion; duplicate SKU/option constraints; cross-product variant mismatch; missing auth/customer denial; current role and MFA/session rechecks inside transactions.
- Stock: same-key concurrent retries return one ledger record; distinct administrators race to consume the last unit and only one succeeds; direct database negative-stock update fails; low-stock query includes the depleted item; conflicting idempotency payload fails.
- Wholesale: current approval changes quotes and revocation immediately removes eligibility; public products never contain tier arrays.
- Ownership/moderation: repeated wishlist/recent saves deduplicate; a second account cannot remove another's entries or reviews; pending reviews are hidden, approval publishes, editing resets moderation; public review authors are omitted.
- CSV: preview performs no product writes; apply is all-or-nothing on validation failure; exact replay returns stored results; mismatched payload/key conflicts; HTTP export uses CSV content type.
- Digital/CMS/failure: private asset keys never reach public products; future CMS publication remains hidden; transaction exceptions roll back prior writes; revoked sessions cannot mutate owned data.
- Existing M2 identity suites continue to cover registration, tokens/refresh replay, verification/reset races, lockout, profile ownership, MFA replay/encryption, privacy workflow and delivery rollback.

## Issues found and resolved

- Prisma cache access initially failed with EPERM; retried using approved engine-cache access. tsx documentation generation needed Windows user-info access. Postman schema download/security audit needed network access. Successful retries are recorded above, not inferred.
- Default repeatable-read isolation could retain a snapshot from before waiting on the catalogue mutex. Switched to READ COMMITTED and verified a stock race with distinct administrator accounts.
- Runtime output schemas now reject accidental private/extra fields before catalogue JSON responses. Validation failures on generated responses become sanitized server errors.
- Audit actions now identify affected catalogue records. Stock/import tables retain idempotency/actor data.
- Generator now formats its output and CI checks regenerated artifacts for drift. No dependencies or audit thresholds were weakened.

## Acceptance and limitations

Local mandatory checks executed successfully with the isolated test database. Ready for review, subject to recorded hosted PR/CI status and owner approval. Manual Postman UI execution, real media storage/digital fulfillment, Truehost deployment, production load testing, low-stock external notifications and exact PRD sub-ID certification were not performed and are not claimed. Existing Gmail credentials were not used to send catalogue test emails. M4 is not started.
