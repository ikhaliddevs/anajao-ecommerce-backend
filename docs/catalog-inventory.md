# Catalogue and inventory (Milestone 3)

## Setup and compatibility

Use Node 24 LTS, `npm ci`, `npm run db:generate`, and deploy migrations with `npm run db:deploy` after reviewing/backing up the target database. The new migration adds catalogue tables and a `wholesaleApproved` flag defaulting to false. It seeds a singleton catalogue lock and adds database checks for stock, prices, sale windows and ratings. MySQL production must support enforced CHECK constraints (MySQL 8.0.16+); Truehost capabilities remain unverified. Application rollback leaves additive tables intact. Do not drop catalogue or identity data as a rollback procedure.

M2 routes remain compatible. Gmail remains opt-in via its existing environment settings. No new external provider credentials are needed for catalogue metadata. The OpenAPI version becomes 3.0.0 while all routes retain `/api/v1`. Swagger is at `/api-docs`.

## Data and authorization rules

- Public endpoints expose published products, active variants and approved reviews. Draft/archived product detail returns 404. No private digital asset keys, wholesale tiers or customer identifiers appear in public product/review responses.
- ADMIN role, confirmed MFA and an MFA-authenticated live session are required for every admin operation. Middleware checks are repeated under the current account lock inside each transaction. SELLER has no catalogue administration permission. Never bypass MFA for fixtures or manual setup over HTTP.
- Catalogue transactions lock the account, then the singleton catalogue row, using READ COMMITTED. This prevents stale snapshots after lock contention and serializes hierarchy changes, cross-row validations, stock updates and imports. This intentionally trades write throughput for straightforward correctness at this milestone. Lock waits/transaction durations are bounded; a multi-writer/high-volume deployment should replace the catalogue-wide lock with a reviewed locking strategy.
- Product/variant updates are full PUT replacements. Unspecified optional fields revert to documented defaults. Products are archived through `status=ARCHIVED`; variants are disabled through `active=false`. There is no destructive product/variant delete endpoint, preserving stock ledger and SKU history.
- SKU values are trimmed, uppercased, globally unique, at most 64 ASCII letters/digits/underscore/hyphen. SKUs remain reserved on archived products. A product cannot have duplicate normalized `(size, colour, style)` tuples. Options use lowercase ASCII labels; a blank label represents a default option. A product has at most 100 variants and 10 images. Category references are exact; category searches do not automatically include descendants. Category parent pointers form an acyclic tree; ancestor traversal is bounded to 20 links during edits.
- Products start DRAFT. Add an active variant before publishing. Product kind and currency are immutable after creation. Images are HTTPS metadata only; no server-side downloads or storage upload integration exists. CMS and review bodies are plain text. Clients must render them as text, never trusted HTML.
- Digital metadata includes format, byte size and an admin-only asset key. No signed download, entitlement or payment fulfillment is implemented. Digital variants use BACKORDER policy to express non-physical availability and reject physical stock adjustments.

## Pricing, inventory and alerts

Prices are integer minor units, never floating-point currency amounts. For NGN, `2500000` means NGN 25,000.00. Product currency is an explicit three-letter label, default NGN; the system performs no currency conversion or tax calculation. A search selects a single currency, avoiding cross-currency sorting.

Sale prices must be at/below base price and have an ordered UTC window. Sales apply at `start <= now < end`, computed during queries; no scheduler is needed. Quantity tiers must have increasing minimum quantities and non-increasing prices. **The owner selected approved wholesale accounts only.** An administrator controls approval at `PUT /api/v1/admin/catalog/wholesale-accounts/{userId}`. CUSTOMER input cannot grant approval. An authenticated quote rechecks current approval and uses the lowest eligible wholesale/sale/base price. Revocation takes effect on the next quote. Quotes do not reserve stock, guarantee a price at checkout or accept orders; M4 must recheck both price and availability transactionally.

Stock stays between 0 and 1,000,000 even for backorders. Physical stock changes only through `POST /api/v1/admin/catalog/variants/{id}/stock-adjustments`, which writes an immutable ledger record and audit event. The request needs an 8–100 character idempotency key. Repeating the exact actor/variant/delta/reason/key returns the original result; reusing a key with different contents returns 409. Two competing decrements cannot overdraw stock.

DENY means a quantity is available only when on-hand stock covers it. BACKORDER permits an advisory quote beyond stock. PREORDER also permits it but requires an availability timestamp; the timestamp remains visible even when it has passed, until an administrator changes the policy. Neither policy makes stock negative or creates an order. `/admin/catalog/low-stock` lists active physical variants with `stock <= lowStockThreshold`; restocking removes them automatically. Alerts are a live view, not email/SMS notifications or an acknowledgment workflow.

## Discovery and customer ownership

`GET /api/v1/catalog/products` accepts `q`, `categoryId`, `currency`, `size`, `colour`, `style`, `minPrice`, `maxPrice`, `inStock`, `sort`, `page` and `limit`. Options and price/stock predicates must match the same active variant. Sorting uses matching variants' effective retail prices. Returned product variants still include all active options. Sort values: `newest`, `name`, `price_asc`, `price_desc`; IDs break ties. Text search is literal name/slug substring search, not a search engine or SQL wildcard syntax. SQL parameters are bound. Search text is 2–80 characters, page is 1–100, limit is 1–50; suggestions cap results at 10. Matching totals can change between requests. Leading substring matching is bounded by request limits but is not a production full-text search index; assess query plans at real catalogue volume.

All list endpoints are bounded. Non-search lists return arrays; use page/limit and stop at a short page. Wishlist and recently viewed IDs are product IDs; the user always comes from the session, never the body. Wishlist is bounded to 500 products and recent history to 50, updated explicitly by PUT. Saves/removals are idempotent. Unpublished products disappear from owned collection reads but can still be removed.

Each account has one review per product. PUT creates/edits that account's review; every edit returns it to PENDING. Public reads show APPROVED reviews only and omit account IDs/names/emails. Administrators list the moderation queue and approve/reject. Purchased-product eligibility and verified-purchase badges await M4 order data; this milestone makes no purchase-verification claim. Deleted/disabled accounts cannot mutate their collections or reviews.

## CSV contract

CSV is supplied as a JSON string to `/admin/catalog/import`, not multipart upload. The exact header is:

```csv
productSlug,name,categoryId,sku,size,colour,style,priceMinor
```

Maximum 100 data rows and 200,000 UTF-8 bytes; quoted commas/newlines and doubled quotes are supported. All rows must be complete. Prices must be decimal integer text. Formula-like cells are rejected on import. Export always quotes cells, doubles embedded quotes and prefixes spreadsheet formulas/control-leading cells with an apostrophe. Export is paginated (maximum 50 variants per page) and contains base retail price, not stock, wholesale tiers, sale schedules or private assets.

Imports are deliberately create-only, producing draft physical products in NGN with zero stock. Multiple rows may define variants for the same new slug if product name/category match. Existing product slugs, SKUs or duplicate options are reported as conflicts. Use product/variant/stock APIs for updates. Preview (`dryRun=true`, default) never writes products, variants, batches or audit events; it returns deterministic row errors for semantic conflicts. Malformed CSV returns 400. Apply (`dryRun=false`) revalidates everything inside the same locked transaction and writes all rows or none. Apply requires an idempotency key; exact retries return the stored result. Changing the CSV or actor with an existing key returns 409. A preview is not a reservation.

## Manual Postman walkthrough

Import `postman/anajao-milestone-03.postman_collection.json` and its matching environment. Use the M2 collection to obtain a verified customer's `accessToken` and an administrator's `adminAccessToken` after MFA login. See `identity-access.md` for trusted admin provisioning. Populate `userId` with the customer account ID for wholesale approval. Do not export filled secret variables.

1. **Create category** POST `/admin/catalog/categories`: `{"slug":"shirts","name":"Shirts"}`. Creation saves `categoryId`. For a subcategory, set `parentId` to that ID.
2. **Create draft product** POST `/admin/catalog/products` using the supplied body; it saves `productId`. Image URLs are examples, not uploaded files.
3. **Create variant** POST `/admin/catalog/products/{{productId}}/variants`; it saves `variantId`. `priceMinor=2500000` and `sku=SHIRT-BLUE-L` are examples. Duplicate SKU/options must return 409.
4. **Receive stock** POST `/admin/catalog/variants/{{variantId}}/stock-adjustments` with `{"delta":20,"reason":"Opening receipt","idempotencyKey":"receipt-demo-001"}`. Repeat unchanged to verify idempotency. A different payload with the same key returns 409. Use a fixed key when testing retries; the collection's `{{$guid}}` generates a new key per send.
5. **Publish product** PUT `/admin/catalog/products/{{productId}}` with its complete original body and `status=PUBLISHED`. Then use public list/detail/search and `?colour=blue&size=l&sort=price_asc&currency=NGN`.
6. **Wholesale** approve `userId` as administrator, then GET `/catalog/variants/{{variantId}}/quote?quantity=10` with the customer's token. Revoke approval and repeat to see retail pricing. Public search never reveals wholesale tiers.
7. **Collections** PUT `/me/wishlist/{{productId}}`, GET `/me/wishlist`, PUT `/me/recently-viewed/{{productId}}`; confirm another customer sees only their own collection.
8. **Review** PUT `/me/reviews/{{productId}}`; the collection saves `reviewId`. Confirm public reviews exclude it, then PUT `/admin/catalog/reviews/{{reviewId}}` with `{"status":"APPROVED"}`. Edit the review and confirm it disappears until reapproved.
9. **CSV** preview the supplied import body with a fresh slug/SKU. Check `valid=true` and no products were created. Change to `dryRun=false` with a fixed new key to apply; replace the preview-only assertion with `pm.expect(body.data.imported).to.eql(1)`. Repeat for idempotency; reuse a conflicting SKU to check rollback. Export from `/admin/catalog/export?page=1&limit=20`.
10. **CMS** create a page/banner; set publication times and compare public `/content` with admin `/admin/content`. **Low stock** use `/admin/catalog/low-stock` after decreasing a physical variant below its threshold.
11. Run the negative requests: absent token 401, customer admin access 403, excessive page size and invalid IDs 400. Also try unknown well-formed UUIDs (404), insufficient stock (409), revoked sessions (401) and an admin session without confirmed MFA (403).

The collection has status/envelope/secret-field assertions and captures created IDs. It is not a linear run-all suite: publication, MFA, wholesale approval, stock keys, review moderation and CSV application need the sequence above. Automated HTTP/database tests are separate; Postman samples are not execution evidence.

## Local test commands

Use a dedicated database ending `_test`. Configure TEST_DATABASE_URL separately; integration tests never fall back to DATABASE_URL. When deploying migrations to that database, override DATABASE_URL only for the migration process. CI supplies an isolated MariaDB 11 database with a dedicated user. Locally, `.env.m3-test` is ignored and must never be committed.

```text
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run build
npm run docs:generate
npm run docs:validate
npm run test:smoke
npm audit --audit-level=high
```

The smoke command also requires TEST_DATABASE_URL. Missing test configuration causes integration skips, not passes. For this workstation, `node --env-file=.env.m3-test node_modules/vitest/vitest.mjs run` loads only the dedicated test URL and runs both test groups. Fixtures use unique prefixes and delete only their own data.
