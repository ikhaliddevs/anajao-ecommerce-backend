import { z } from "zod";
import type { CatalogOperation } from "./catalog.operations.js";
const id = z.uuid();
const integer = z.number().int();
const timestamp = z.iso.datetime();
const nullableDate = timestamp.nullable();
const tier = z.object({ id, variantId: id, minQuantity: integer, priceMinor: integer }).strict();
const image = z.object({ url: z.string(), alt: z.string(), position: integer }).strict();
const publicVariant = z
  .object({
    id,
    sku: z.string(),
    size: z.string(),
    colour: z.string(),
    style: z.string(),
    priceMinor: integer,
    stock: integer,
    stockPolicy: z.string(),
    preorderAvailableAt: nullableDate
  })
  .strict();
const adminVariant = publicVariant.extend({
  productId: id,
  active: z.boolean(),
  salePriceMinor: integer.nullable(),
  saleStartsAt: nullableDate,
  saleEndsAt: nullableDate,
  lowStockThreshold: integer,
  tiers: z.array(tier)
});
const product = z
  .object({
    id,
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    categoryId: id,
    kind: z.string(),
    currency: z.string(),
    digitalFormat: z.string().nullable(),
    digitalBytes: integer.nullable(),
    images: z.array(image),
    variants: z.array(publicVariant)
  })
  .strict();
const adminProduct = product.extend({
  status: z.string(),
  digitalAssetKey: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  images: z.array(image.extend({ id, productId: id })),
  variants: z.array(adminVariant)
});
const category = z
  .object({ id, slug: z.string(), name: z.string(), parentId: id.nullable() })
  .strict();
const cms = z
  .object({
    id,
    slug: z.string(),
    kind: z.string(),
    title: z.string(),
    body: z.string(),
    imageUrl: z.string().nullable(),
    targetPath: z.string().nullable(),
    published: z.boolean(),
    startsAt: nullableDate,
    endsAt: nullableDate,
    updatedAt: timestamp
  })
  .strict();
const review = z.object({ id, rating: integer, body: z.string(), createdAt: timestamp }).strict();
const adminReview = review.extend({
  userId: id,
  productId: id,
  status: z.string(),
  updatedAt: timestamp
});
const deleted = z.object({ deleted: z.literal(true) }).strict();
const saved = z.object({ saved: z.literal(true) }).strict();
export const catalogResponseSchemas: Record<CatalogOperation["key"], z.ZodType> = {
  search: z
    .object({ items: z.array(product), total: integer, page: integer, limit: integer })
    .strict(),
  suggestions: z.array(z.object({ id, slug: z.string(), name: z.string() }).strict()),
  product,
  categories: z.array(category),
  createCategory: category,
  updateCategory: category,
  deleteCategory: deleted,
  adminProducts: z.array(adminProduct),
  createProduct: adminProduct,
  updateProduct: adminProduct,
  createVariant: adminVariant,
  updateVariant: adminVariant,
  stock: z
    .object({
      id,
      variantId: id,
      actorId: id,
      idempotencyKey: z.string(),
      delta: integer,
      resultingStock: integer,
      reason: z.string(),
      createdAt: timestamp
    })
    .strict(),
  lowStock: z.array(
    z
      .object({ id, sku: z.string(), stock: integer, lowStockThreshold: integer, productId: id })
      .strict()
  ),
  wholesale: z.object({ userId: id, approved: z.boolean() }).strict(),
  quote: z
    .object({
      variantId: id,
      currency: z.string(),
      quantity: integer,
      unitPriceMinor: integer,
      totalPriceMinor: integer,
      wholesaleApplied: z.boolean(),
      available: z.boolean(),
      stockPolicy: z.string(),
      preorderAvailableAt: nullableDate,
      reserved: z.literal(false)
    })
    .strict(),
  wishlist: z.array(product),
  recent: z.array(product),
  saveWishlist: saved,
  saveRecent: saved,
  deleteWishlist: deleted,
  deleteRecent: deleted,
  reviews: z.array(review),
  saveReview: adminReview,
  deleteReview: deleted,
  moderationQueue: z.array(adminReview),
  moderate: adminReview,
  cms: z.array(cms),
  adminCms: z.array(cms),
  createCms: cms,
  updateCms: cms,
  csvExport: z.string(),
  csvImport: z.union([
    z
      .object({
        valid: z.boolean(),
        rows: integer,
        errors: z.array(z.object({ row: integer, message: z.string() }).strict())
      })
      .strict(),
    z.object({ imported: integer, productIds: z.array(id) }).strict()
  ])
};
