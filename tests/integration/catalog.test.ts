import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { PrismaDatabaseClient } from "../../src/database/client.js";
import { CatalogRepository } from "../../src/modules/catalog/catalog.repository.js";
import { CatalogService } from "../../src/modules/catalog/catalog.service.js";
import { IdentityCrypto, digest } from "../../src/modules/identity/identity.crypto.js";
import type { Principal } from "../../src/modules/identity/identity.service.js";
import * as v from "../../src/modules/catalog/catalog.validation.js";
import { csvHeaders } from "../../src/modules/catalog/catalog.csv.js";
import { testEnv, silentLogger } from "../helpers.js";

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith("_test"))
  throw new Error("Dedicated _test database required");
const prefix = `m3-${randomUUID()}`;
const data = <T>(r: { body: unknown }) => (r.body as { data: T }).data;
describe.skipIf(!url)("catalogue MariaDB invariants", () => {
  const database = new PrismaDatabaseClient(silentLogger, url);
  const db = database.prisma;
  const service = new CatalogService(new CatalogRepository(db));
  const { app } = createApp({ env: testEnv, logger: silentLogger, database });
  let admin: Principal;
  let secondAdmin: Principal;
  let customer: Principal;
  let other: Principal;
  let adminToken: string;
  let customerToken: string;
  let categoryId: string;
  let productId: string;
  let variantId: string;
  const crypto = new IdentityCrypto(testEnv);
  const fixture = async (role: "ADMIN" | "CUSTOMER"): Promise<Principal> => {
    const user = await db.user.create({
      data: {
        email: `${prefix}-${randomUUID()}@example.com`,
        name: "Test fixture",
        passwordHash: "not-a-login-hash",
        role,
        status: "ACTIVE",
        emailVerifiedAt: new Date()
      }
    });
    if (role === "ADMIN")
      await db.mfaFactor.create({
        data: {
          userId: user.id,
          encryptedSecret: crypto.encrypt(crypto.newMfa().secret),
          confirmedAt: new Date()
        }
      });
    const session = await db.session.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: digest(randomUUID()),
        mfaVerified: role === "ADMIN",
        expiresAt: new Date(Date.now() + 3600000)
      }
    });
    return { userId: user.id, sessionId: session.id, role, mfaVerified: session.mfaVerified };
  };
  const productInput = (extra = {}) =>
    v.productSchema.parse({
      slug: prefix,
      name: "Test shirt",
      description: "Plain text",
      categoryId,
      ...extra
    });
  const variantInput = (extra = {}) =>
    v.variantSchema.parse({
      sku: prefix,
      priceMinor: 10000,
      size: "L",
      colour: "Blue",
      tiers: [{ minQuantity: 5, priceMinor: 7000 }],
      ...extra
    });
  beforeAll(async () => {
    await database.connect();
    admin = await fixture("ADMIN");
    secondAdmin = await fixture("ADMIN");
    customer = await fixture("CUSTOMER");
    other = await fixture("CUSTOMER");
    adminToken = await crypto.sign(admin.userId, admin.sessionId);
    customerToken = await crypto.sign(customer.userId, customer.sessionId);
    categoryId = (
      await service.saveCategory(admin, { name: "Fixture", slug: prefix, parentId: null })
    ).id;
    productId = (await service.saveProduct(admin, productInput())).id;
    variantId = (await service.saveVariant(admin, productId, variantInput())).id;
  });
  afterAll(async () => {
    const users = await db.user.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true }
    });
    const ids = users.map((u) => u.id);
    const products = await db.product.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true }
    });
    const productIds = products.map((p) => p.id);
    await db.stockAdjustment.deleteMany({ where: { variant: { productId: { in: productIds } } } });
    await db.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    await db.category.updateMany({
      where: { slug: { startsWith: prefix } },
      data: { parentId: null }
    });
    await db.category.deleteMany({ where: { slug: { startsWith: prefix } } });
    await db.cmsContent.deleteMany({ where: { slug: { startsWith: prefix } } });
    await db.catalogImport.deleteMany({ where: { actorId: { in: ids } } });
    await db.auditEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await database.disconnect();
  });
  it("requires authentication, current ADMIN and confirmed MFA even at the service boundary", async () => {
    await request(app).get("/api/v1/admin/catalog/products").expect(401);
    await request(app)
      .get("/api/v1/admin/catalog/products")
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(403);
    await expect(
      service.saveCategory(customer, { name: "X", slug: "x", parentId: null })
    ).rejects.toMatchObject({ statusCode: 403 });
    await db.session.update({ where: { id: admin.sessionId }, data: { mfaVerified: false } });
    await expect(service.adminProducts(admin, { page: 1, limit: 10 })).rejects.toMatchObject({
      statusCode: 403
    });
    await db.session.update({ where: { id: admin.sessionId }, data: { mfaVerified: true } });
    await db.user.update({ where: { id: admin.userId }, data: { role: "CUSTOMER" } });
    await expect(service.adminProducts(admin, { page: 1, limit: 10 })).rejects.toMatchObject({
      statusCode: 403
    });
    await db.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });
  });
  it("hides draft products, validates HTTP input, then publishes without private prices", async () => {
    await request(app).get(`/api/v1/catalog/products/${productId}`).expect(404);
    await request(app).get("/api/v1/catalog/products?limit=500").expect(400);
    await request(app)
      .post("/api/v1/admin/catalog/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...productInput(), currency: "BAD-CURRENCY" })
      .expect(400);
    await service.saveProduct(admin, productInput({ status: "PUBLISHED" }), productId);
    const result = await request(app).get(`/api/v1/catalog/products/${productId}`).expect(200);
    expect(JSON.stringify(result.body)).not.toMatch(
      /tiers|digitalAssetKey|password|wholesaleApproved/
    );
  });
  it("prevents category cycles, duplicate SKUs/options and cross-product variant updates", async () => {
    const child = await service.saveCategory(admin, {
      name: "Child",
      slug: `${prefix}-child`,
      parentId: categoryId
    });
    await expect(
      service.saveCategory(admin, { name: "Parent", slug: prefix, parentId: child.id }, categoryId)
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.deleteCategory(admin, categoryId)).rejects.toMatchObject({
      statusCode: 409
    });
    await expect(
      service.saveVariant(admin, productId, variantInput({ size: "m" }))
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      service.saveVariant(admin, productId, variantInput({ sku: `${prefix}-2` }))
    ).rejects.toMatchObject({ statusCode: 409 });
    const second = await service.saveProduct(admin, productInput({ slug: `${prefix}-second` }));
    await expect(
      service.saveVariant(admin, second.id, variantInput(), variantId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  it("serializes stock adjustments, enforces nonnegative stock and deduplicates retries", async () => {
    const initial = { delta: 1, reason: "Test receipt", idempotencyKey: randomUUID() };
    const results = await Promise.all([
      service.adjustStock(admin, variantId, initial),
      service.adjustStock(admin, variantId, initial)
    ]);
    expect(results[0].id).toBe(results[1].id);
    const competing = await Promise.allSettled([
      service.adjustStock(admin, variantId, {
        delta: -1,
        reason: "A",
        idempotencyKey: randomUUID()
      }),
      service.adjustStock(secondAdmin, variantId, {
        delta: -1,
        reason: "B",
        idempotencyKey: randomUUID()
      })
    ]);
    expect(competing.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(0);
    await expect(
      service.adjustStock(admin, variantId, { ...initial, delta: 2 })
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      db.productVariant.update({ where: { id: variantId }, data: { stock: -1 } })
    ).rejects.toThrow();
    expect(
      (await service.lowStock(admin, { page: 1, limit: 50 })).some((v) => v.id === variantId)
    ).toBe(true);
  });
  it("filters/sorts effective sale prices and treats wildcard text literally", async () => {
    await service.saveVariant(
      admin,
      productId,
      variantInput({
        salePriceMinor: 8000,
        saleStartsAt: new Date(Date.now() - 60000).toISOString(),
        saleEndsAt: new Date(Date.now() + 60000).toISOString()
      }),
      variantId
    );
    const result = await service.search(
      v.searchSchema.parse({
        categoryId,
        colour: "blue",
        size: "l",
        maxPrice: 8500,
        sort: "price_asc"
      })
    );
    expect(result.items.map((p) => p.id)).toContain(productId);
    expect(result.items.find((p) => p.id === productId)?.variants[0]?.priceMinor).toBe(8000);
    expect((await service.search(v.searchSchema.parse({ categoryId, colour: "red" }))).total).toBe(
      0
    );
    expect((await service.search(v.searchSchema.parse({ q: "%%" }))).total).toBe(0);
  });
  it("requires current wholesale approval for quantity discounts and applies revocation immediately", async () => {
    expect((await service.quote(customer, variantId, 5)).unitPriceMinor).toBe(8000);
    await service.wholesale(admin, customer.userId, true);
    expect((await service.quote(customer, variantId, 5)).unitPriceMinor).toBe(7000);
    await service.wholesale(admin, customer.userId, false);
    expect((await service.quote(customer, variantId, 5)).unitPriceMinor).toBe(8000);
  });
  it("keeps collections owned and makes repeated saves idempotent", async () => {
    await service.saveCollection(customer, "wishlist", productId);
    await service.saveCollection(customer, "wishlist", productId);
    expect(await service.collection(customer, "wishlist", { page: 1, limit: 10 })).toHaveLength(1);
    expect(await service.collection(other, "wishlist", { page: 1, limit: 10 })).toHaveLength(0);
    await service.saveCollection(other, "wishlist", productId, true);
    expect(await service.collection(customer, "wishlist", { page: 1, limit: 10 })).toHaveLength(1);
    await service.saveCollection(customer, "recent", productId);
    await service.saveCollection(customer, "recent", productId);
    expect(await service.collection(customer, "recent", { page: 1, limit: 10 })).toHaveLength(1);
  });
  it("moderates reviews and resets approval on edits without exposing customer identity", async () => {
    const review = await service.saveReview(customer, productId, { rating: 5, body: "Good" });
    expect(await service.reviews(productId, { page: 1, limit: 10 })).toHaveLength(0);
    await service.moderate(admin, review.id, "APPROVED");
    const rows = await service.reviews(productId, { page: 1, limit: 10 });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(customer.userId);
    await service.deleteReview(other, productId);
    expect(await service.reviews(productId, { page: 1, limit: 10 })).toHaveLength(1);
    await service.saveReview(customer, productId, { rating: 4, body: "Edited" });
    expect(await service.reviews(productId, { page: 1, limit: 10 })).toHaveLength(0);
  });
  it("previews CSV without writes, rejects all on conflict and replays applied batches", async () => {
    const csv =
      csvHeaders.join(",") +
      `\n${prefix}-csv,CSV shirt,${categoryId},${prefix}-CSV,m,red,regular,2000\n`;
    const before = await db.product.count();
    expect(await service.csvImport(admin, { csv, dryRun: true })).toMatchObject({ valid: true });
    expect(await db.product.count()).toBe(before);
    const key = randomUUID();
    const result = await service.csvImport(admin, { csv, dryRun: false, idempotencyKey: key });
    expect(await service.csvImport(admin, { csv, dryRun: false, idempotencyKey: key })).toEqual(
      result
    );
    await expect(
      service.csvImport(admin, {
        csv: csv.replace("2000", "3000"),
        dryRun: false,
        idempotencyKey: key
      })
    ).rejects.toMatchObject({ statusCode: 409 });
    const bad =
      csvHeaders.join(",") + `\n${prefix}-bad,A,${categoryId},${prefix},m,red,regular,1\n`;
    const count = await db.product.count();
    await expect(
      service.csvImport(admin, { csv: bad, dryRun: false, idempotencyKey: randomUUID() })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await db.product.count()).toBe(count);
    const exported = await request(app)
      .get("/api/v1/admin/catalog/export")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(exported.headers["content-type"]).toContain("text/csv");
  });
  it("hides digital asset keys and unpublished/scheduled CMS content", async () => {
    const product = await service.saveProduct(
      admin,
      productInput({
        slug: `${prefix}-digital`,
        kind: "DIGITAL",
        digitalAssetKey: "private-object-key",
        digitalFormat: "PDF",
        digitalBytes: 42
      })
    );
    await service.saveVariant(
      admin,
      product.id,
      variantInput({ sku: `${prefix}-D`, stockPolicy: "BACKORDER" })
    );
    await service.saveProduct(
      admin,
      productInput({
        slug: `${prefix}-digital`,
        kind: "DIGITAL",
        digitalAssetKey: "private-object-key",
        status: "PUBLISHED"
      }),
      product.id
    );
    expect(JSON.stringify(await service.product(product.id))).not.toContain("private-object-key");
    const cms = await service.saveCms(
      admin,
      v.cmsSchema.parse({
        slug: `${prefix}-cms`,
        kind: "PAGE",
        title: "Test",
        body: "Plain text",
        published: true,
        startsAt: new Date(Date.now() + 3600000).toISOString()
      })
    );
    expect((await service.cms({ page: 1, limit: 50 })).map((c) => c.id)).not.toContain(cms.id);
    const response = await request(app).get("/api/v1/catalog/products?currency=NGN").expect(200);
    expect(data<{ items: unknown[] }>(response).items.length).toBeGreaterThan(0);
  });
  it("rolls back all mutations on audit failure and rejects a revoked session", async () => {
    const before = (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
    await expect(
      new CatalogRepository(db).transaction(admin, true, async (tx) => {
        await tx.productVariant.update({ where: { id: variantId }, data: { stock: before + 1 } });
        throw new Error("Simulated audit failure");
      })
    ).rejects.toThrow("Simulated audit failure");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(
      before
    );
    await db.session.update({ where: { id: customer.sessionId }, data: { revokedAt: new Date() } });
    await expect(service.saveCollection(customer, "wishlist", productId)).rejects.toMatchObject({
      statusCode: 401
    });
  });
});
