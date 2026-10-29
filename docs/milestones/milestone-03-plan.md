# Milestone 3 implementation plan

Date: 2026-10-27 (Africa/Lagos). Owner approved M2 and requested M3. Verified clean tree, M1 ancestry and M2/Gmail/security changes merged into origin/develop at `1cf28c3` (PR #6). Branch: `feature/milestone-03-catalog-inventory`, created by fast-forwarding develop. The confirmed repository remains ikhaliddevs/anajao-ecommerce-backend; the supplied library owner is obsolete.

## Ordered work

1. Confirm pricing eligibility and document catalogue/data contracts; add additive schema and migration.
2. Implement transactional, audited catalogue administration with current ADMIN/MFA/session rechecks, categories, products, variants, images and stock ledger.
3. Implement bounded public discovery, effective-time prices, inventory policy, CSV preview/import/export and plain-text CMS content.
4. Implement owned wishlist/recent history and moderated reviews.
5. Exercise isolated database concurrency, rollback, authorization, ownership, validation and query boundaries; execute all quality/security gates.
6. Generate and validate OpenAPI/Postman artifacts; write summary/test reports, update AGENTS.md and prepare M4 prompt.
7. Make incremental commits, push and open a review PR against develop. Never auto-merge.

## Provisional PRD mapping

The actual PRD acceptance text was not supplied. These are implementation groupings, not claims of verified sub-ID compliance:

| ID       | Planned coverage                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| FR-01    | Catalogue, category tree, product/variant metadata, search/filter/sort/suggestions, wishlist/recent/reviews |
| FR-04    | Inventory, stock ledger, low-stock visibility, preorder/backorder and price schedules/quantity tiers        |
| FR-07-03 | Audited catalogue administration and CSV preview/import/export                                              |
| FR-07-08 | Banner/page CMS management and moderation                                                                   |

## Scope and decisions

- Preserve identity contracts and administrator MFA. SELLER receives no marketplace privileges in M3.
- Prices use integer minor units with explicit three-letter currency labels; NGN is the default and searches select one currency. No exchange/conversion or tax calculation. Owner chose approved wholesale accounts only; a separate administrator-controlled approval flag gates quantity tiers and is rechecked for each quote.
- Image and digital metadata only: HTTPS image URLs, no uploads/fetching, no public digital download secrets or entitlement issuance.
- Reviews are moderated; purchase verification awaits M4 order data. No checkout/payment/order work.
- Low-stock alerts are a live paginated query over persisted stock and thresholds; no implied external notification service or acknowledged-alert history.
- No production provider/storage costs introduced; Truehost capability verification remains external.
- Integration tests must use an isolated `_test` database and clean only their own fixtures. Never reset development data.

Status: implementation in progress; not an acceptance report.
