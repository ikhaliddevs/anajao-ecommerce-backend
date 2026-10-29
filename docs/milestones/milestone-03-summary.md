# Milestone 3 — Catalogue and inventory

Date: 2026-10-27 (Africa/Lagos). Feature branch: `feature/milestone-03-catalog-inventory`. Baseline: verified `origin/develop` at `1cf28c3`, including M2/Gmail/security follow-up merge PR #6. Owner authorized M3 and chose wholesale tiers restricted to approved accounts. Confirmed repository: ikhaliddevs/anajao-ecommerce-backend (the pasted library owner is obsolete).

## Coverage

| Provisional PRD group | Delivered behavior                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01                 | Categories/subcategories, draft/published/archived products, HTTPS image metadata, digital metadata, unique SKUs, size/colour/style variants, bounded search/suggestions/filtering/sorting, owned wishlist/recent history, moderated reviews |
| FR-04                 | Minor-unit retail/scheduled sale pricing, approved-account wholesale tiers, stock ledger/idempotency, nonnegative inventory, low-stock query, backorder/preorder availability policies                                                       |
| FR-07-03              | MFA-protected transactional administration, safe create-only CSV preview/import and paginated formula-safe export                                                                                                                            |
| FR-07-08              | Plain-text CMS pages/banners with publication windows and review moderation                                                                                                                                                                  |

Underlying PRD acceptance definitions are absent; the mapping is provisional, not a claim of independently verified sub-ID compliance. The scope/rules are detailed in [catalogue contracts and walkthrough](../catalog-inventory.md).

## Modules and migration

- `src/modules/catalog`: operations, validation, response schemas, controller/router, service, repository transaction/search boundary, pricing, CSV and OpenAPI generation. 33 routes; public/customer/admin access is explicit.
- `src/app.ts` and `src/config/openapi.ts`: catalogue composition and OpenAPI 3.0.0 API version; existing `/api/v1` identity contracts remain compatible.
- `prisma/schema.prisma` and `20261027160000_catalog_inventory/migration.sql`: additive User wholesale flag; CatalogLock, CatalogImport, Category, Product, ProductImage, ProductVariant, PriceTier, StockAdjustment, WishlistItem, RecentlyViewed, ProductReview and CmsContent; unique keys, indexes, FKs, lock seed and database CHECK constraints.
- `tests/catalog.test.ts` and `tests/integration/catalog.test.ts`: pricing/validation/CSV and actual MariaDB authorization, races, ownership, visibility, moderation, rollback and idempotency tests. Existing identity tests also execute against the isolated database.
- Generation/validation/smoke scripts, CI generated-artifact drift check, OpenAPI snapshot, 37-request M3 Postman collection and empty-secret environment; M2 artifacts preserved.
- AGENTS.md, implementation plan, contracts/walkthrough, this summary, test report, PR handoff and M4 prompt.

No new package dependency is required. No development/production reset or migration was performed; new tables were deployed only to the dedicated `_test` database during verification.

## Security and consistency

Every privileged catalogue operation rechecks the current account/session/ADMIN role/confirmed MFA under the account lock. Catalogue mutations serialize through a singleton lock with READ COMMITTED; role/session revocation and stock adjustment cannot rely solely on stale middleware claims. Race tests use distinct administrators. Public responses use strict schemas and omit wholesale tiers/private digital keys/review identities. Audit actions identify affected catalogue records; stock/import records additionally retain idempotency/actor data.

Stock stays nonnegative even under backorder/preorder policies; quotes do not reserve or consume it. Sale start is inclusive and end exclusive. Quantity tiers are only considered for currently approved accounts. CSV preview is read-only, apply is all-or-nothing and replay-safe, and exported spreadsheet cells are neutralized. User collections/reviews derive ownership solely from the current session.

## Acceptance and release

Local implementation and verification results are in [the execution report](milestone-03-test-report.md). PR/release status is tracked in [the review handoff](../pull-request-milestone-03.md). Ready for owner review after the recorded gates; not automatically merged, production-certified or authorization to begin M4.

## Remaining risks and reviewer actions

- Confirm the provisional PRD mapping against the actual PRD; manually exercise the Postman sequence with an MFA administrator and two customers.
- Review migration/backups and Truehost support for enforced CHECK constraints. Local Node 26/MariaDB 10.4 differ from CI Node 24/MariaDB 11.
- XAMPP failed creation of a dedicated least-privilege test user with ER_NOT_KEYFILE. Local tests used existing XAMPP root only against the dedicated `_test` database. CI uses a dedicated isolated user. Repair local account provisioning separately; never carry root/no-password configuration into deployment.
- Catalogue-wide serialization limits write throughput; literal substring search is not an external full-text service. Evaluate at real production scale.
- Low-stock alerts are a live query, not email notifications. Image/storage and digital delivery are metadata boundaries. Reviews are not purchase-verified until order data exists.
- CSV is deliberately create-only/NGN/zero initial stock. Resource PUT requests replace complete editable fields; clients must send full bodies. Archived SKUs remain reserved.
- Quotes are advisory. M4 must reserve stock and revalidate currency/price/wholesale approval. No checkout, payment execution, orders, FX, marketplace permissions or digital entitlement delivery was added.
- Establish audit/import-idempotency retention policies and operational monitoring before production.

Next prompt: `docs/prompts/milestone-04-commerce-payments.md`. Owner approval and reviewed M3 merge are required before starting it.
