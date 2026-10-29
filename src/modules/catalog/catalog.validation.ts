import { z } from "zod";

export const id = z.uuid();
export const slug = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = (max: number) => z.string().trim().min(1).max(max);
export const money = z.number().int().min(0).max(1000000000);
const date = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const httpsUrl = z
  .url()
  .max(1000)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use an HTTPS URL without credentials");
export const pageSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .strict();
export const searchSchema = pageSchema
  .extend({
    q: z.string().trim().min(2).max(80).optional(),
    categoryId: id.optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("NGN"),
    size: text(40).optional(),
    colour: text(40).optional(),
    style: text(40).optional(),
    minPrice: z.coerce.number().int().min(0).max(1000000000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(1000000000).optional(),
    inStock: z.enum(["true", "false"]).optional(),
    sort: z.enum(["newest", "name", "price_asc", "price_desc"]).default("newest")
  })
  .refine(
    (v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice,
    "Invalid price range"
  );
export const categorySchema = z
  .object({ name: text(100), slug, parentId: id.nullable().default(null) })
  .strict();
export const productSchema = z
  .object({
    name: text(150),
    slug,
    description: z.string().trim().max(20000),
    categoryId: id,
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    kind: z.enum(["PHYSICAL", "DIGITAL"]).default("PHYSICAL"),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("NGN"),
    digitalFormat: text(50).nullable().default(null),
    digitalBytes: z.number().int().positive().max(2147483647).nullable().default(null),
    digitalAssetKey: text(255).nullable().default(null),
    images: z
      .array(z.object({ url: httpsUrl, alt: z.string().trim().max(200) }).strict())
      .max(10)
      .default([])
  })
  .strict()
  .refine(
    (v) => v.kind === "DIGITAL" || (!v.digitalFormat && !v.digitalBytes && !v.digitalAssetKey),
    "Physical products cannot contain digital metadata"
  );
const option = z
  .string()
  .trim()
  .toLowerCase()
  .max(40)
  .regex(/^[a-z0-9 -]*$/)
  .default("");
export const variantSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9_-]{0,63}$/),
    size: option,
    colour: option,
    style: option,
    active: z.boolean().default(true),
    priceMinor: money,
    salePriceMinor: money.nullable().default(null),
    saleStartsAt: date.nullable().default(null),
    saleEndsAt: date.nullable().default(null),
    lowStockThreshold: z.number().int().min(0).max(1000000).default(5),
    stockPolicy: z.enum(["DENY", "BACKORDER", "PREORDER"]).default("DENY"),
    preorderAvailableAt: date.nullable().default(null),
    tiers: z
      .array(
        z.object({ minQuantity: z.number().int().min(2).max(10000), priceMinor: money }).strict()
      )
      .max(20)
      .default([])
  })
  .strict()
  .superRefine((v, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (v.salePriceMinor !== null) {
      if (
        !v.saleStartsAt ||
        !v.saleEndsAt ||
        v.saleStartsAt >= v.saleEndsAt ||
        v.salePriceMinor > v.priceMinor
      )
        fail("Sale needs an ordered window and price at or below base price");
    } else if (v.saleStartsAt || v.saleEndsAt) fail("Sale dates require a sale price");
    if ((v.stockPolicy === "PREORDER") !== (v.preorderAvailableAt !== null))
      fail("Only preorder policy requires an availability date");
    let previousQuantity = 1;
    let previousPrice = v.priceMinor;
    for (const tier of v.tiers) {
      if (tier.minQuantity <= previousQuantity || tier.priceMinor > previousPrice)
        fail("Tiers must have increasing quantities and non-increasing prices");
      previousQuantity = tier.minQuantity;
      previousPrice = tier.priceMinor;
    }
  });
export const stockSchema = z
  .object({
    delta: z
      .number()
      .int()
      .min(-1000000)
      .max(1000000)
      .refine((v) => v !== 0),
    reason: text(200),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/)
  })
  .strict();
export const reviewSchema = z
  .object({ rating: z.number().int().min(1).max(5), body: text(2000) })
  .strict();
export const moderationSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) }).strict();
export const wholesaleSchema = z.object({ approved: z.boolean() }).strict();
export const quoteSchema = z
  .object({ quantity: z.coerce.number().int().min(1).max(10000).default(1) })
  .strict();
export const importSchema = z
  .object({
    csv: z.string().min(1).max(200000),
    dryRun: z.boolean().default(true),
    idempotencyKey: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,100}$/)
      .optional()
  })
  .strict()
  .refine((v) => v.dryRun || v.idempotencyKey, "Import requires an idempotency key");
export const cmsSchema = z
  .object({
    slug,
    kind: z.enum(["PAGE", "BANNER"]),
    title: text(150),
    body: z.string().max(20000),
    imageUrl: httpsUrl.nullable().default(null),
    targetPath: z
      .string()
      .max(200)
      .regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/)
      .nullable()
      .default(null),
    published: z.boolean().default(false),
    startsAt: date.nullable().default(null),
    endsAt: date.nullable().default(null)
  })
  .strict()
  .refine((v) => !v.startsAt || !v.endsAt || v.startsAt < v.endsAt, "Invalid publication window");
export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
