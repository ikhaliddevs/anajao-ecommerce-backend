# Anajao backend — Milestone 3: Catalogue and inventory

Start only after the owner explicitly approves Milestone 3 and Milestone 2 is reviewed and merged. Never merge the Milestone 2 PR automatically.

## Role and repository

Act as principal backend engineer, database engineer, security reviewer and release lead. Work in the existing `ikhaliddevs/anajao-ecommerce-backend` repository. Read AGENTS.md, docs/setup.md, docs/identity-access.md, docs/prompts/BACKEND_CODEX_PROMPTS.md and both Milestone 2 reports before implementation. Preserve strict TypeScript, modular Express, Prisma 7 with the MariaDB adapter, Zod, Pino, Vitest/Supertest and npm. Node 24 LTS is the runtime target. Do not rebuild the earlier milestones or implement frontend/mobile features.

## Startup and branch control

1. Inspect git status, origin, branches, PR/CI status, migration history and existing APIs. Preserve uncommitted work.
2. Fetch origin, verify Milestone 2 is merged into develop, safely fast-forward local develop, then create `feature/milestone-03-catalog-inventory`. If the merge/base is inconsistent, report it and obtain owner approval before choosing a different base.
3. Produce a concise ordered plan and provisional mapping to FR-01, FR-04, FR-07-03 and FR-07-08. Obtain the actual PRD if exact sub-requirement wording is missing; never invent acceptance text.

## Actual baseline and carry-forward constraints

- Identity uses CUSTOMER/ADMIN/SELLER roles, ACTIVE/PENDING_VERIFICATION/DISABLED/LOCKED statuses, short bearer JWTs and database-backed rotating refresh families.
- Every privileged catalog mutation must recheck the current role, account, session and confirmed MFA within the transaction that changes data. Reuse the authentication boundary and extend the repository transaction appropriately; a middleware-only authorization snapshot is insufficient.
- Admin provisioning is an operator procedure; public registration cannot assign privileged roles. Do not weaken MFA to seed catalog data.
- Existing email/SMS delivery is an injectable preparation boundary, social login returns 503, and privacy requests require manual fulfillment. Do not claim these external integrations are live. Inspect the Milestone 2 report for remaining blockers and CI evidence.
- Tests require an isolated TEST_DATABASE_URL ending in `_test`; fixtures clean up only their own data. Keep development/production databases untouched.
- Review scoped dependency overrides when updating Prisma. Validate generation, additive migration deployment and database tests after changing the dependency tree.

## Required scope

Implement categories/subcategories, products, image metadata, sizes/colours/styles, variants, pricing, inventory/stock levels, low-stock alerts, preorder/backorder rules, CSV import/export with dry-run validation, scheduled sale pricing, tiered/wholesale pricing, digital-product metadata, and CMS banner/page content.

Implement public search, suggestions, filters, sorting and pagination with bounded query costs and indexes. Add authenticated recently viewed, wishlist and reviews with ownership and moderation. Define a unique SKU policy even if barcodes are deferred. SELLER is a reserved role; cross-seller catalog permissions and marketplace operations remain M6 unless the owner approves a narrower preparatory boundary.

Use thin controllers, explicit DTO validation, service rules and repositories. Preserve transactional inventory invariants and audited privileged changes. Define currency/rounding and effective-time pricing rules. Prevent duplicate variants, stock underflow and racing adjustments using atomic/locked operations and constraints. CSV uploads must have size/row limits, deterministic errors and spreadsheet-formula injection protection on export. Dry runs must never mutate data. External media/storage integrations require verified configuration and a test adapter; image metadata does not imply a working upload/storage provider.

Do not implement checkout, payment execution, orders, fulfillment or seller payouts. Order-backed review eligibility must remain an explicit deferred rule until M4 supplies order data.

## Verification and delivery gate

Execute and record installation, Prisma generation, additive migration deployment against isolated MariaDB, typecheck, lint, formatting, unit tests, database integration tests, security/dependency checks and build. Test authorization/MFA, ownership, public visibility, search/filter/sort/pagination bounds, duplicate variants/SKUs, inventory races, CSV injection/limits/dry runs and pricing windows/rounding. Never call skipped or blocked tests passed. Verify built server health/readiness and Swagger.

Update OpenAPI and validate it. Generate and schema-validate a Postman Collection v2.1 and an empty-secret example environment with success/error assertions, realistic example responses and a manual walkthrough. Cover category/product/variant CRUD, stock adjustments, import preview/export, wishlist/reviews and search. Keep generated docs aligned with actual routes.

Write `docs/milestones/milestone-03-summary.md` and `milestone-03-test-report.md`, including PRD mapping, schema changes, actual commands/results, unresolved risks and acceptance verdict. Update AGENTS.md without removing unrelated rules. Generate the Milestone 4 cart/checkout/payments prompt from the library, adjusted to the actual implementation. Make incremental commits, push the feature branch, and open a PR targeting develop with migration notes, test evidence and reviewer checklist. If access is blocked, provide the exact command and compare URL. Do not claim a PR or CI pass without verifying it.

Stop after delivering the branch/commit, PR link or precise blocker, reports, Postman artifacts, AGENTS.md changes and next prompt. Never auto-merge or begin Milestone 4 without owner approval.
