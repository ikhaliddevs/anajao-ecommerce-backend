# Anajao Ecommerce — Backend Codex Prompt Library

Version 1.0 | KAM VOGUE | Node.js + Express + TypeScript + MariaDB

## Usage

Store this file in `docs/prompts/BACKEND_CODEX_PROMPTS.md` in the backend repository. For each milestone, copy the relevant prompt into Codex or ask Codex to read that section and execute only that milestone. M1 is marked completed by the project owner; M2 is next. All prompts require verification of actual repository state.

## Milestone 01 — Backend foundation

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 01: BACKEND FOUNDATION
Target window: Weeks 1–2
Requirements: Already merged according to project owner; historical reference only. Inspect current code rather than re-running.

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-01-foundation from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-01-summary.md and milestone-01-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-02-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Repository, environment, MariaDB connectivity, health/readiness, OpenAPI baseline, CI, logging.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 02 — Identity and access

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 02: IDENTITY AND ACCESS
Target window: Weeks 3–4
Requirements: FR-02-01 through FR-02-06; FR-08-01 through FR-08-03; FR-07-01

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-02-identity-access from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-02-summary.md and milestone-02-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-03-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Implement secure customer registration/login, email/phone verification via provider abstraction, forgot/reset password with expiring one-time tokens, Google/Apple social login only behind verified provider configuration, profile and saved addresses, order-history/reorder API contracts only if order data exists (otherwise defer to M4), account deletion/privacy request workflow, RBAC for customer/admin/seller roles, admin MFA (TOTP or vetted provider), login throttling, session/token rotation and revocation, audit logging. Prefer Argon2id or a justified strong password hash; never store raw verification/reset tokens. Decide cookie vs bearer token strategy and document CSRF/CORS protections. Migration tables should cover users, roles/permissions, verification challenges, sessions/refresh tokens, addresses, MFA factors and privacy requests with indexes and unique constraints. Enforce least privilege and avoid user enumeration. Acceptance: unauthorized/forbidden access blocked; invalid/expired/reused tokens rejected; password reset invalidates relevant sessions; MFA required for privileged operations; rate limits and account lifecycle tested. Postman examples: POST /api/v1/auth/register, /login, /refresh, /logout, /verify, /forgot-password, /reset-password; GET/PATCH /api/v1/me; GET/POST /api/v1/me/addresses; admin RBAC checks. Match actual routes in code and document differences.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 03 — Catalogue and inventory

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 03: CATALOGUE AND INVENTORY
Target window: Weeks 5–6
Requirements: FR-01; FR-04; FR-07-03 and FR-07-08

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-03-catalog-inventory from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-03-summary.md and milestone-03-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-04-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Implement categories/subcategories, products, images metadata, sizes/colours/styles, variant pricing, stock levels, low-stock alerts, backorder/preorder rules, CSV import/export with dry-run validation, scheduled sale pricing, tiered/wholesale pricing, digital product metadata and CMS banner/page content. Implement search, suggestions, filters and sorting as API endpoints with pagination and safe query limits; recently viewed/wishlist/reviews require authenticated ownership and moderation. Ensure unique SKU policy is explicit even if barcode feature not selected. Test stock invariants, duplicate variants, CSV injection protection, ownership, search filters and transactional updates. Postman examples: create/update/list products, categories, variants, stock adjustment, CSV import preview, wishlist, reviews and public search.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 04 — Cart, checkout and payments

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 04: CART, CHECKOUT AND PAYMENTS
Target window: Weeks 7–8
Requirements: FR-03; FR-05-01, FR-05-02, FR-05-04

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-04-commerce-payments from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-04-summary.md and milestone-04-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-05-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Implement persistent carts, cart line validation, checkout pricing snapshot, shipping-zone/rate calculation, order creation, order-state machine, transaction records, invoice/receipt generation and payment provider adapters for Paystack and Flutterwave. Support bank-transfer confirmation workflow and conditional cash-on-delivery; cards must be handled by compliant gateway, never stored on our server. Enforce webhook signature validation, replay protection, idempotency keys, atomic stock reservation/decrement and amount/currency verification. Multiple currencies require a documented rate-source and rounding strategy; no fake FX rates. Test concurrent checkout, duplicate webhooks, failed payments, underpayment, refunds eligibility and stock rollback. Postman: cart add/edit/remove, quote shipping, checkout, payment initialization, webhook fixtures and order status.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 05 — Fulfilment and after-sales

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 05: FULFILMENT AND AFTER-SALES
Target window: Weeks 9–10
Requirements: FR-05; FR-03-10 and FR-03-11

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-05-fulfilment-after-sales from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-05-summary.md and milestone-05-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-06-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Implement fulfilment workflow, packing slips, delivery zones, local pickup, shipment/tracking records, courier adapter with sandbox/mock fallback, proof-of-delivery metadata, order-status notifications, returns/exchanges/cancellations and full/partial refund requests with approval controls. Integrate transactional notification provider via configurable adapter; ensure retry/outbox pattern and deduplication. Test illegal status transitions, duplicate fulfilment, refunds exceeding captured amount, return authorization, courier outage and notification retries. Postman: fulfilment create, shipment update, pickup confirmation, return request, refund approval and tracking.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 06 — Multi-vendor marketplace

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 06: MULTI-VENDOR MARKETPLACE
Target window: Weeks 11–12
Requirements: FR-09-01 through FR-09-03; FR-07-07

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-06-marketplace from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-06-summary.md and milestone-06-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-07-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Implement seller registration/onboarding/review, seller-specific catalog permissions, seller dashboard API, commission policy and ledger, payout eligibility and reconciliation model, platform audit trail and tenant isolation. Design multi-seller checkout allocation without mixing seller funds; no direct payout execution until provider support, compliance and settlement rules are confirmed. Test seller isolation, unauthorized cross-seller updates, commission rounding, payout duplicate prevention, dispute states and admin overrides. Postman: seller apply/approve, seller products, seller orders, commission ledger, payout requests.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 07 — Engagement and operations

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 07: ENGAGEMENT AND OPERATIONS
Target window: Weeks 13–14
Requirements: FR-06; FR-07; FR-09-04, FR-09-09, FR-09-10

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-07-engagement-operations from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-07-summary.md and milestone-07-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-08-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Implement promotion rules, flash sales, referral tracking, gift-card/store-credit ledger, abandoned-cart jobs, email marketing adapter, content/blog APIs, analytics events, admin revenue/inventory reports, subscription/recurring-order data model and provider integration hooks, external API keys/scopes and AI recommendation adapter (fallback to deterministic related-product recommendations). Add WhatsApp/live-chat configuration endpoints and web push registration/consent where backend is needed. Google Analytics/Meta Pixel are frontend integrations; provide event contract only. POS integration belongs to M8. Test coupon abuse, referral self-awards, gift-card double-spend, subscription retries, report authorization, PII minimization and job idempotency. Postman: promotions, gift cards, referral events, reporting, API keys and recommendation requests.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```

## Milestone 08 — Security, POS and production release

```text
ANAJAO ECOMMERCE — BACKEND MILESTONE 08: SECURITY, POS AND PRODUCTION RELEASE
Target window: Weeks 15–16
Requirements: FR-08; FR-09-08; all backend release acceptance

ROLE AND RULES
Act as a principal backend engineer, security reviewer, database engineer and release lead. Work only in the existing backend repository https://github.com/cycodedconcept/anajao-ecommerce-backend.git. Use Node.js, Express, strict TypeScript and XAMPP MariaDB locally, with MySQL-compatible production deployment subject to Truehost capabilities. Respect the existing repository architecture, package manager, ORM, AGENTS.md and conventions; inspect them before editing. Do not rebuild Milestone 1 or implement frontend/React components. Never commit secrets or real customer data. Do not invent test results or claim a PR exists unless verified.

STARTUP AND BRANCH CONTROL
1. Inspect git status, remote, branches, merged history, AGENTS.md, migrations, existing tests, API docs and prior milestone report. Verify Milestone 1 was merged into develop; if it was merged into main only, report the discrepancy and request approval before choosing a base. Do not discard uncommitted work.
2. Fetch origin, checkout and update develop using a safe fast-forward; create feature/milestone-08-hardening-release from develop. If develop is absent, stop and ask rather than inventing branch state.
3. Write a short implementation plan and map requirements to PRD IDs; note missing external credentials, vendor approvals or unclear scope. Use incremental commits.

ENGINEERING REQUIREMENTS
Apply layered architecture with thin controllers, service-level business logic, repository/data access, request/response validation, centralized error mapping, auditability, pagination and least-privilege authorization. Use transactional consistency, DB constraints, indexes and safe migrations. Define OpenAPI schemas and do not leak credentials or personal data in logs. Maintain backwards compatibility or document breaking changes. Prefer testable provider interfaces and sandbox implementations over pretending external services are live.

MANDATORY COMPLETION GATE — DO THIS FOR EACH MILESTONE
- Run and record actual install/build, typecheck, lint, formatting, unit, integration and relevant security tests. Clearly mark any blocked/not-run checks; do not call a blocked milestone complete.
- Add positive, negative, validation, authorization, idempotency/race-condition and failure-path tests as relevant. Use isolated test DB and safe fixture data.
- Update OpenAPI docs; generate a valid Postman Collection v2.1 and example environment with sample bodies, success/error assertions and no live secrets. Include manual Postman walkthrough.
- Produce docs/milestones/milestone-08-summary.md and milestone-08-test-report.md, listing PRD mapping, files changed, schema migrations, test commands/results, risks, unresolved work and acceptance verdict.
- Update AGENTS.md with stable project rules, completed milestone status, next milestone pointer and current commands; do not replace unrelated rules.
- Create docs/prompts/milestone-release-*.md for the NEXT milestone from this prompt library, adjusted to actual repository state (for M8 produce release/handover prompt instead).
- Commit and push the feature branch, then open a GitHub PR against develop using gh if authenticated. Include implementation summary, screenshots only if relevant, migration notes, tests and reviewer checklist. If blocked, provide exact command and compare URL; do not claim PR created. Never auto-merge.
- Stop after delivering the milestone report, test report, Postman artifacts, updated AGENTS.md, next prompt, branch/commit and PR URL or blocker.

MILESTONE-SPECIFIC IMPLEMENTATION
Integrate POS adapter with documented reconciliation/conflict policy and offline considerations. Complete penetration-oriented security review, dependency checks, permission matrix, backup/restore drills, migration rollback plan, query/index tuning, load tests, observability, incident runbook and deployment configuration for Truehost ONLY after verifying Node runtime, process management, TLS, environment secrets, database version, backups and deployment access. Produce UAT scenarios, deployment checklist, release notes, operations handover and known deferred features. Do not deploy without explicit approval and verified hosting capabilities. Test restore, rollback, outage recovery, payment reconciliation, authorization and production configuration. Postman: release smoke suite covering all critical APIs.

BEFORE CODING
Inspect the current repo, prior PR, existing migrations and API contracts. Confirm dependencies and produce an ordered task checklist. Ask for approval only where a choice could materially alter security, cost, data model or production integrations; otherwise proceed with documented assumptions.

FINAL RESPONSE FORMAT
1. Summary and PRD coverage; 2. changed modules/migrations; 3. exact test commands and real results; 4. Postman collection path and example requests; 5. AGENTS.md changes; 6. next milestone prompt path; 7. Git branch, commit hash and PR link (or precise blocker); 8. remaining risks and reviewer actions.
```
