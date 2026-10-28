# Catalogue, inventory and approved wholesale pricing

Adds the M3 catalogue backend to the existing identity foundation. Administrators with current MFA sessions can manage category trees, draft/published products, image/digital metadata, globally unique variants, stock adjustments, approved-account wholesale pricing, CSV imports and CMS content. Customers can search published products, request current price quotes, maintain their own collections and submit moderated reviews.

Stock adjustments are transactional and idempotent; two administrators cannot consume the same last unit. Sale prices apply at request time, and wholesale tiers are hidden from public responses and require current approval. Quotes do not reserve stock or create orders. CSV preview never writes, apply is create-only/all-or-nothing and export neutralizes spreadsheet formulas.

## Migration and compatibility

- Additive `20261027160000_catalog_inventory`: catalogue/content/collection/review/ledger tables, User wholesale flag default false, constraints/indexes and singleton lock seed. Back up and review before deployment. Requires enforced CHECK support; verify Truehost capabilities.
- Existing `/api/v1` identity contracts remain compatible. Catalogue writes use account-then-catalogue locking and READ COMMITTED with in-transaction ADMIN/MFA rechecks.
- No new runtime dependencies, checkout/payment flows, media uploads or digital entitlement delivery. Products/variants are archived/deactivated rather than destructively deleted.

## Verification

- Install, Prisma generation and isolated MariaDB migration deployment passed.
- Typecheck, lint, formatting and build passed.
- 34 unit tests and 27 database integration tests passed; zero skipped in the successful isolated run.
- Built server: 9 smoke assertions passed.
- OpenAPI and M2/M3 Postman collections validated; npm audit reported zero vulnerabilities.
- Detailed evidence and limitations: `docs/milestones/milestone-03-test-report.md`.

## Reviewer checklist

- [ ] Confirm provisional mapping to FR-01, FR-04, FR-07-03 and FR-07-08 against the actual PRD.
- [ ] Review migration/backup plan, global SKU policy, integer currency amounts, full PUT semantics and create-only CSV rules.
- [ ] Review current ADMIN/MFA transaction rechecks, distinct-admin stock race, idempotency behavior and approved-only wholesale pricing.
- [ ] Exercise the M3 Postman walkthrough with an MFA administrator and two customer accounts.
- [ ] Review capacity limits: catalogue-wide write lock, literal substring search, bounded import/export/list sizes.
- [ ] Confirm hosted CI on the PR head. Do not auto-merge; M4 requires owner approval.

Local XAMPP could not create a dedicated test user (`ER_NOT_KEYFILE`), so tests used existing local root only against the dedicated `_test` database. CI uses its own isolated database/user. No development or production data was reset. Exact PRD definitions, production load/storage/Truehost verification and purchase-verified review eligibility remain outside the verified scope.

Artifacts: `docs/catalog-inventory.md`, both M3 milestone reports, `postman/anajao-milestone-03.postman_collection.json`, matching environment, updated AGENTS.md and `docs/prompts/milestone-04-commerce-payments.md`.

## Release status

Feature branch: `feature/milestone-03-catalog-inventory`; base: `develop`. Implementation commit: `5ca90df`; verification/artifact commit: `bb2cd2e`. Branch pushed and [PR #7](https://github.com/ikhaliddevs/anajao-ecommerce-backend/pull/7) verified open against develop, unmerged, on 2026-10-28. The first push timed out before authentication; the retry succeeded. gh was unavailable, so the existing credential-safe GitHub API helper created and read back the PR. Hosted check results must be verified on the current PR head separately from the local results above. Never auto-merge.
