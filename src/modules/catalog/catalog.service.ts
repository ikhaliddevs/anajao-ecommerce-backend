import { createHash } from "node:crypto";
import type { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import type { Principal } from "../identity/identity.service.js";
import {
  type CatalogRepository,
  productInclude,
  type CatalogProduct,
  type CatalogTransaction
} from "./catalog.repository.js";
import { effectivePrice, quotePrice } from "./catalog.pricing.js";
import { exportCsv, importRows } from "./catalog.csv.js";
import type * as schemas from "./catalog.validation.js";

const missing = () => new AppError("Catalogue record not found", 404, "NOT_FOUND");
const conflict = (message: string) => new AppError(message, 409, "CONFLICT");
const pageArgs = (page: { page: number; limit: number }) => ({
  skip: (page.page - 1) * page.limit,
  take: page.limit
});
const publicProduct = (product: CatalogProduct, now = new Date()) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  categoryId: product.categoryId,
  kind: product.kind,
  currency: product.currency,
  digitalFormat: product.digitalFormat,
  digitalBytes: product.digitalBytes,
  images: product.images.map(({ url, alt, position }) => ({ url, alt, position })),
  variants: product.variants
    .filter((v) => v.active)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      colour: v.colour,
      style: v.style,
      priceMinor: effectivePrice(v, now),
      stock: v.stock,
      stockPolicy: v.stockPolicy,
      preorderAvailableAt: v.preorderAvailableAt
    }))
});
const audit = (tx: CatalogTransaction, principal: Principal, action: string) =>
  tx.auditEvent.create({ data: { userId: principal.userId, action } });
const published = async (tx: CatalogTransaction, id: string) => {
  const product = await tx.product.findUnique({ where: { id } });
  if (!product || product.status !== "PUBLISHED") throw missing();
  return product;
};

export class CatalogService {
  constructor(readonly repo: CatalogRepository) {}
  async search(input: schemas.SearchInput) {
    const now = new Date();
    const result = await this.repo.search(input, now);
    return { ...result, items: result.items.map((p) => publicProduct(p, now)) };
  }
  async suggestions(input: schemas.SearchInput) {
    const result = await this.search({
      ...input,
      page: 1,
      limit: Math.min(input.limit, 10),
      sort: "name"
    });
    return result.items.map(({ id, name, slug }) => ({ id, name, slug }));
  }
  async product(id: string) {
    const result = await this.repo.db.product.findUnique({
      where: { id },
      include: productInclude
    });
    if (!result || result.status !== "PUBLISHED") throw missing();
    return publicProduct(result);
  }
  categories(page: z.infer<typeof schemas.pageSchema>) {
    return this.repo.db.category.findMany({
      ...pageArgs(page),
      orderBy: [{ name: "asc" }, { id: "asc" }]
    });
  }
  saveCategory(principal: Principal, data: z.infer<typeof schemas.categorySchema>, id?: string) {
    return this.repo.transaction(principal, true, async (tx) => {
      if (id && !(await tx.category.findUnique({ where: { id } }))) throw missing();
      let parentId = data.parentId;
      const seen = new Set(id ? [id] : []);
      for (let depth = 0; parentId; depth++) {
        if (seen.has(parentId) || depth >= 20)
          throw conflict("Category hierarchy would cycle or exceed 20 levels");
        seen.add(parentId);
        const parent = await tx.category.findUnique({ where: { id: parentId } });
        if (!parent) throw missing();
        parentId = parent.parentId;
      }
      const result = id
        ? await tx.category.update({ where: { id }, data })
        : await tx.category.create({ data });
      await audit(tx, principal, "CATEGORY_SAVED");
      return result;
    });
  }
  deleteCategory(principal: Principal, id: string) {
    return this.repo.transaction(principal, true, async (tx) => {
      if (
        (await tx.category.count({ where: { parentId: id } })) ||
        (await tx.product.count({ where: { categoryId: id } }))
      )
        throw conflict("Category is in use");
      if (!(await tx.category.deleteMany({ where: { id } })).count) throw missing();
      await audit(tx, principal, "CATEGORY_DELETED");
      return { deleted: true };
    });
  }
  adminProducts(principal: Principal, page: z.infer<typeof schemas.pageSchema>) {
    return this.repo.transaction(principal, true, (tx) =>
      tx.product.findMany({
        ...pageArgs(page),
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        include: productInclude
      })
    );
  }
  saveProduct(principal: Principal, input: schemas.ProductInput, id?: string) {
    return this.repo.transaction(principal, true, async (tx) => {
      if (!(await tx.category.findUnique({ where: { id: input.categoryId } }))) throw missing();
      if (id) {
        const old = await tx.product.findUnique({ where: { id } });
        if (!old) throw missing();
        if (old.currency !== input.currency || old.kind !== input.kind)
          throw conflict("Product currency and kind are immutable; create another product");
      }
      if (
        input.status === "PUBLISHED" &&
        (!id || !(await tx.productVariant.count({ where: { productId: id, active: true } })))
      )
        throw conflict("Create an active variant before publishing");
      const { images, ...data } = input;
      const result = id
        ? await tx.product.update({ where: { id }, data })
        : await tx.product.create({ data });
      await tx.productImage.deleteMany({ where: { productId: result.id } });
      if (images.length)
        await tx.productImage.createMany({
          data: images.map((image, position) => ({ ...image, position, productId: result.id }))
        });
      await audit(tx, principal, "PRODUCT_SAVED");
      return tx.product.findUniqueOrThrow({ where: { id: result.id }, include: productInclude });
    });
  }
  saveVariant(principal: Principal, productId: string, input: schemas.VariantInput, id?: string) {
    return this.repo.transaction(principal, true, async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw missing();
      if (id && !(await tx.productVariant.findFirst({ where: { id, productId } }))) throw missing();
      if (!id && (await tx.productVariant.count({ where: { productId } })) >= 100)
        throw conflict("Maximum 100 variants per product");
      if (product.kind === "DIGITAL" && input.stockPolicy !== "BACKORDER")
        throw conflict(
          "Digital variants use BACKORDER; entitlement enforcement belongs to checkout"
        );
      if (
        product.status === "PUBLISHED" &&
        !input.active &&
        id &&
        !(await tx.productVariant.count({ where: { productId, active: true, id: { not: id } } }))
      )
        throw conflict("Archive product before deactivating its last variant");
      const { tiers, ...data } = input;
      const result = id
        ? await tx.productVariant.update({ where: { id }, data })
        : await tx.productVariant.create({ data: { ...data, productId } });
      await tx.priceTier.deleteMany({ where: { variantId: result.id } });
      if (tiers.length)
        await tx.priceTier.createMany({
          data: tiers.map((tier) => ({ ...tier, variantId: result.id }))
        });
      await audit(tx, principal, "VARIANT_SAVED");
      return tx.productVariant.findUniqueOrThrow({
        where: { id: result.id },
        include: { tiers: true }
      });
    });
  }
  adjustStock(principal: Principal, variantId: string, data: z.infer<typeof schemas.stockSchema>) {
    return this.repo.transaction(principal, true, async (tx) => {
      const previous = await tx.stockAdjustment.findUnique({
        where: { idempotencyKey: data.idempotencyKey }
      });
      if (previous) {
        if (
          previous.actorId !== principal.userId ||
          previous.variantId !== variantId ||
          previous.delta !== data.delta ||
          previous.reason !== data.reason
        )
          throw conflict("Idempotency key already used for another request");
        return previous;
      }
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true }
      });
      if (!variant) throw missing();
      if (variant.product.kind === "DIGITAL")
        throw conflict("Digital products do not track physical stock");
      const stock = variant.stock + data.delta;
      if (stock < 0 || stock > 1000000)
        throw conflict("Stock must remain between zero and 1000000");
      await tx.productVariant.update({ where: { id: variantId }, data: { stock } });
      const result = await tx.stockAdjustment.create({
        data: { ...data, variantId, actorId: principal.userId, resultingStock: stock }
      });
      await audit(tx, principal, "STOCK_ADJUSTED");
      return result;
    });
  }
  lowStock(principal: Principal, page: z.infer<typeof schemas.pageSchema>) {
    return this.repo.transaction(principal, true, (tx) =>
      tx.productVariant.findMany({
        where: {
          active: true,
          stock: { lte: tx.productVariant.fields.lowStockThreshold },
          product: { kind: "PHYSICAL", status: { not: "ARCHIVED" } }
        },
        ...pageArgs(page),
        orderBy: [{ stock: "asc" }, { id: "asc" }],
        select: { id: true, sku: true, stock: true, lowStockThreshold: true, productId: true }
      })
    );
  }
  wholesale(principal: Principal, userId: string, approved: boolean) {
    return this.repo.transaction(principal, true, async (tx) => {
      if (!(await tx.user.findUnique({ where: { id: userId } }))) throw missing();
      await tx.user.update({ where: { id: userId }, data: { wholesaleApproved: approved } });
      await audit(tx, principal, approved ? "WHOLESALE_APPROVED" : "WHOLESALE_REVOKED");
      // Target gets an audit record too, so approval history identifies the affected account.
      if (userId !== principal.userId)
        await tx.auditEvent.create({
          data: {
            userId,
            action: approved ? "WHOLESALE_APPROVAL_RECEIVED" : "WHOLESALE_APPROVAL_REMOVED"
          }
        });
      return { userId, approved };
    });
  }
  quote(principal: Principal, variantId: string, quantity: number) {
    return this.repo.transaction(principal, false, async (tx, wholesale) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true, tiers: true }
      });
      if (!variant || !variant.active || variant.product.status !== "PUBLISHED") throw missing();
      return {
        variantId,
        currency: variant.product.currency,
        ...quotePrice(variant, quantity, wholesale),
        reserved: false
      };
    });
  }
  collection(
    principal: Principal,
    kind: "wishlist" | "recent",
    page: z.infer<typeof schemas.pageSchema>
  ) {
    return this.repo.transaction(principal, false, async (tx) => {
      const where = { userId: principal.userId, product: { status: "PUBLISHED" } };
      const include = { product: { include: productInclude } };
      const rows =
        kind === "wishlist"
          ? await tx.wishlistItem.findMany({
              where,
              include,
              ...pageArgs(page),
              orderBy: [{ createdAt: "desc" }, { productId: "asc" }]
            })
          : await tx.recentlyViewed.findMany({
              where,
              include,
              ...pageArgs(page),
              orderBy: [{ viewedAt: "desc" }, { productId: "asc" }]
            });
      return rows.map((row) => publicProduct(row.product));
    });
  }
  saveCollection(
    principal: Principal,
    kind: "wishlist" | "recent",
    productId: string,
    remove = false
  ) {
    return this.repo.transaction(principal, false, async (tx) => {
      const key = { userId: principal.userId, productId };
      if (remove) {
        if (kind === "wishlist") await tx.wishlistItem.deleteMany({ where: key });
        else await tx.recentlyViewed.deleteMany({ where: key });
        return { deleted: true };
      }
      await published(tx, productId);
      if (kind === "wishlist") {
        if (
          (await tx.wishlistItem.count({ where: { userId: principal.userId } })) >= 500 &&
          !(await tx.wishlistItem.findUnique({ where: { userId_productId: key } }))
        )
          throw conflict("Wishlist limit reached");
        await tx.wishlistItem.upsert({ where: { userId_productId: key }, create: key, update: {} });
      } else {
        await tx.recentlyViewed.upsert({
          where: { userId_productId: key },
          create: key,
          update: { viewedAt: new Date() }
        });
        const old = await tx.recentlyViewed.findMany({
          where: { userId: principal.userId },
          orderBy: [{ viewedAt: "desc" }, { productId: "asc" }],
          skip: 50,
          take: 1
        });
        if (old[0])
          await tx.recentlyViewed.delete({
            where: { userId_productId: { userId: principal.userId, productId: old[0].productId } }
          });
      }
      return { saved: true };
    });
  }
  async reviews(productId: string, page: z.infer<typeof schemas.pageSchema>) {
    await published(this.repo.db, productId);
    return this.repo.db.productReview.findMany({
      where: { productId, status: "APPROVED" },
      ...pageArgs(page),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: { id: true, rating: true, body: true, createdAt: true }
    });
  }
  saveReview(principal: Principal, productId: string, data: z.infer<typeof schemas.reviewSchema>) {
    return this.repo.transaction(principal, false, async (tx) => {
      await published(tx, productId);
      const key = { userId: principal.userId, productId };
      const result = await tx.productReview.upsert({
        where: { userId_productId: key },
        create: { ...key, ...data },
        update: { ...data, status: "PENDING" }
      });
      await audit(tx, principal, "REVIEW_SUBMITTED");
      return result;
    });
  }
  deleteReview(principal: Principal, productId: string) {
    return this.repo.transaction(principal, false, async (tx) => {
      await tx.productReview.deleteMany({ where: { userId: principal.userId, productId } });
      await audit(tx, principal, "REVIEW_DELETED");
      return { deleted: true };
    });
  }
  moderationQueue(principal: Principal, page: z.infer<typeof schemas.pageSchema>) {
    return this.repo.transaction(principal, true, (tx) =>
      tx.productReview.findMany({
        where: { status: "PENDING" },
        ...pageArgs(page),
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      })
    );
  }
  moderate(principal: Principal, id: string, status: "APPROVED" | "REJECTED") {
    return this.repo.transaction(principal, true, async (tx) => {
      if (!(await tx.productReview.findUnique({ where: { id } }))) throw missing();
      const result = await tx.productReview.update({ where: { id }, data: { status } });
      await audit(tx, principal, "REVIEW_MODERATED");
      return result;
    });
  }
  cms(page: z.infer<typeof schemas.pageSchema>) {
    const now = new Date();
    return this.repo.db.cmsContent.findMany({
      where: {
        published: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
        ]
      },
      ...pageArgs(page),
      orderBy: { slug: "asc" }
    });
  }
  adminCms(principal: Principal, page: z.infer<typeof schemas.pageSchema>) {
    return this.repo.transaction(principal, true, (tx) =>
      tx.cmsContent.findMany({ ...pageArgs(page), orderBy: { slug: "asc" } })
    );
  }
  saveCms(principal: Principal, data: z.infer<typeof schemas.cmsSchema>, id?: string) {
    return this.repo.transaction(principal, true, async (tx) => {
      if (id && !(await tx.cmsContent.findUnique({ where: { id } }))) throw missing();
      const result = id
        ? await tx.cmsContent.update({ where: { id }, data })
        : await tx.cmsContent.create({ data });
      await audit(tx, principal, "CMS_SAVED");
      return result;
    });
  }
  csvExport(principal: Principal, page: z.infer<typeof schemas.pageSchema>) {
    return this.repo.transaction(principal, true, async (tx) => {
      const rows = await tx.productVariant.findMany({
        ...pageArgs(page),
        orderBy: { sku: "asc" },
        include: { product: true }
      });
      return exportCsv(
        rows.map((v) => [
          v.product.slug,
          v.product.name,
          v.product.categoryId,
          v.sku,
          v.size,
          v.colour,
          v.style,
          v.priceMinor
        ])
      );
    });
  }
  csvImport(principal: Principal, input: z.infer<typeof schemas.importSchema>) {
    const rows = importRows(input.csv);
    const digest = createHash("sha256").update(input.csv).digest("hex");
    return this.repo.transaction(principal, true, async (tx) => {
      if (!input.dryRun && input.idempotencyKey) {
        const old = await tx.catalogImport.findUnique({
          where: { idempotencyKey: input.idempotencyKey }
        });
        if (old) {
          if (old.actorId !== principal.userId || old.digest !== digest)
            throw conflict("Import idempotency key conflict");
          return old.result;
        }
      }
      const errors: { row: number; message: string }[] = [];
      const skus = new Set<string>();
      const options = new Set<string>();
      const products = new Map<string, schemas.ProductInput>();
      for (const [index, row] of rows.entries()) {
        const fail = (message: string) => errors.push({ row: index + 2, message });
        const option = JSON.stringify([
          row.product.slug,
          row.variant.size,
          row.variant.colour,
          row.variant.style
        ]);
        if (
          skus.has(row.variant.sku) ||
          (await tx.productVariant.findUnique({ where: { sku: row.variant.sku } }))
        )
          fail("Duplicate SKU");
        if (options.has(option)) fail("Duplicate variant options");
        skus.add(row.variant.sku);
        options.add(option);
        if (!(await tx.category.findUnique({ where: { id: row.product.categoryId } })))
          fail("Category not found");
        // Create-only import: never silently overwrite published products or stock.
        if (await tx.product.findUnique({ where: { slug: row.product.slug } }))
          fail("Product slug already exists; use product/variant update APIs");
        const first = products.get(row.product.slug);
        if (
          first &&
          (first.name !== row.product.name || first.categoryId !== row.product.categoryId)
        )
          fail("Inconsistent product metadata");
        products.set(row.product.slug, row.product);
      }
      if (input.dryRun) return { valid: errors.length === 0, rows: rows.length, errors };
      if (errors.length)
        throw new AppError(
          "Import validation failed; run dry-run for row errors",
          400,
          "INVALID_CSV"
        );
      const ids = new Map<string, string>();
      for (const [slug, product] of products) {
        const { images, ...data } = product;
        void images;
        ids.set(slug, (await tx.product.create({ data })).id);
      }
      for (const row of rows) {
        const { tiers, ...data } = row.variant;
        void tiers;
        await tx.productVariant.create({
          data: { ...data, productId: ids.get(row.product.slug)! }
        });
      }
      const result = { imported: rows.length, productIds: [...ids.values()] };
      await tx.catalogImport.create({
        data: { idempotencyKey: input.idempotencyKey!, actorId: principal.userId, digest, result }
      });
      await audit(tx, principal, "CATALOG_IMPORTED");
      return result;
    });
  }
}
