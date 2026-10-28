# Milestone 4 — Cart, checkout and payments

Start only after the owner approves M3, its reviewed feature PR is merged into develop, and the owner explicitly authorizes M4. Do not auto-merge or infer approval from this handoff.

Act as principal backend engineer, database engineer, security reviewer and release lead in the existing `ikhaliddevs/anajao-ecommerce-backend` repository. Preserve strict TypeScript, Node 24 LTS, modular Express, Prisma 7/MariaDB adapter, Zod, Pino, Vitest/Supertest and npm. No frontend/mobile work. Never commit secrets or real customer data.

## Startup

Read AGENTS.md, docs/setup.md, docs/identity-access.md, docs/catalog-inventory.md, M3 summary/test report, docs/pull-request-milestone-03.md and the M4 section of docs/prompts/BACKEND_CODEX_PROMPTS.md. Inspect status/remotes/history/PR and migrations; preserve uncommitted work. Fetch, verify M3 is merged into develop, fast-forward develop safely and branch `feature/milestone-04-commerce-payments`. Stop for clarification if develop/base conflicts with verified history. Use incremental commits.

Write an ordered plan and provisional mapping to FR-03 and FR-05-01/02/04. Obtain the actual PRD acceptance definitions rather than inventing them. Request only material security, cost, schema or production-integration decisions. Confirm supported currencies, tax/shipping/COD policies and payment credentials before depending on them.

## Carry-forward constraints

- Bearer JWTs are backed by rotating database sessions. ADMIN mutations require current account/session/role and confirmed MFA rechecks in the same transaction. SELLER remains reserved for M6.
- Wholesale quantity pricing is restricted to administrator-approved accounts, not all customers. Recheck approval at checkout. Preserve minor-unit integer amounts, explicit currency, UTC sale boundaries and non-increasing tier prices. Never trust client totals, cached quotes or invented FX rates.
- M3 quotes are advisory and do not reserve stock. Stock is nonnegative, physical adjustments are ledgered/idempotent, and digital variants do not track physical stock. Design atomic order reservations, expiry, release and final consumption without decrementing twice. Keep the account-then-catalogue lock order/READ COMMITTED policy or explicitly review a replacement for deadlocks and isolation. M3 uses a catalogue-wide lock suitable for limited write volume, not an unreviewed high-throughput deployment.
- Product IDs/SKUs are stable; archived variants retain global SKU uniqueness. Public DTOs exclude wholesale tier lists and private digital asset keys. Entitlement/download delivery requires verified storage configuration; metadata alone is not fulfillment.
- Reviews are moderated but not purchase-verified yet. Order-backed eligibility and any badge must use real paid/fulfilled order state.
- Gmail SMTP is opt-in. SMS/social login, media storage, transaction outbox/retries and Truehost production verification are not complete integrations. Do not expose test sinks over HTTP.
- Dedicated `_test` database only; never default integration tests to DATABASE_URL. Local XAMPP account provisioning previously returned ER_NOT_KEYFILE; do not repair system tables or reuse development data without an explicitly reviewed procedure. CI has its own isolated MariaDB service/user.

## Required implementation

Implement persistent owned carts, line validation, immutable checkout price snapshots, shipping zone/rate quotes, order creation/state machine, transaction records, invoices/receipts and injectable Paystack/Flutterwave adapters. Support an auditable bank-transfer confirmation workflow and conditional COD. Card data must stay with compliant gateways; never store PAN/CVV.

Validate webhook signatures against raw bytes, amounts, currency and provider transaction identity. Protect against replay, duplicate callbacks, out-of-order events and retries. Use durable idempotency keys and atomic stock reservation/consumption/release. Test failed initialization, provider outage, underpayment, duplicate capture notifications, concurrent checkouts, reservation expiry, stock rollback and refund eligibility. Cross-currency checkout requires an approved rate source/rounding policy; otherwise reject unsupported mixes explicitly. Do not invent live provider functionality in the absence of credentials; use clearly labeled sandbox adapters and fixtures.

Keep controllers thin, business rules in services, data access in repositories, explicit request/response schemas, centralized sanitized errors, bounded queries, DB constraints and transactional auditability. Additive migrations require review and rollback notes; never reset shared databases.

## Delivery gate

Run and record actual install, Prisma generation, isolated migrations, typecheck, lint, format check, unit/integration/security tests, build, API artifact validation and built-server smoke tests. Missing/skipped tests are not passes. Extend concurrency, authorization, ownership and failure-path coverage. Update OpenAPI and generate/validate a Postman v2.1 collection/environment with no live secrets, sample bodies and assertions. Walkthrough: cart add/edit/remove, shipping quote, checkout, payment initialization, webhook fixtures, order state.

Produce M4 summary/test reports with PRD mapping, migration/files, exact command results, acceptance verdict and remaining risks. Update AGENTS.md without deleting unrelated rules and prepare M5 fulfillment/after-sales prompt from the library. Commit, push and open a PR against develop with migration notes, verification evidence and reviewer checklist. Use gh if authenticated; otherwise report the exact blocker, push/PR command and compare URL. Never claim a PR/CI pass without verification. Stop after the M4 delivery; never auto-merge or start M5.

Final response: coverage; modules/migrations; exact checks/results; Postman path/examples; AGENTS changes; next prompt; branch/commit/PR or blocker; risks/reviewer actions.
