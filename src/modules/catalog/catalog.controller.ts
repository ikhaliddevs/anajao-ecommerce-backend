import type { Request, RequestHandler } from "express";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { principal } from "../identity/identity.middleware.js";
import type { CatalogService } from "./catalog.service.js";
import * as v from "./catalog.validation.js";
import { catalogResponseSchemas } from "./catalog.responses.js";
import { AppError } from "../../common/errors/app-error.js";

export const createCatalogController = (service: CatalogService) => {
  const action = (work: (req: Request) => Promise<unknown>, status = 200): RequestHandler =>
    asyncHandler(async (req, res) => {
      const result: unknown = JSON.parse(JSON.stringify(await work(req)));
      const key = res.locals.catalogOperation as keyof typeof catalogResponseSchemas;
      const parsed = catalogResponseSchemas[key].safeParse(result);
      if (!parsed.success) throw new AppError("Invalid catalogue response", 500, "INTERNAL_ERROR");
      res.status(status).json({ success: true, data: parsed.data });
    });
  const id = (req: Request, key = "id") => v.id.parse(req.params[key]);
  const page = (req: Request) => v.pageSchema.parse(req.query);
  return {
    search: action((r) => service.search(v.searchSchema.parse(r.query))),
    suggestions: action((r) => service.suggestions(v.searchSchema.parse(r.query))),
    product: action((r) => service.product(id(r))),
    categories: action((r) => service.categories(page(r))),
    createCategory: action(
      (r) => service.saveCategory(principal(r), v.categorySchema.parse(r.body)),
      201
    ),
    updateCategory: action((r) =>
      service.saveCategory(principal(r), v.categorySchema.parse(r.body), id(r))
    ),
    deleteCategory: action((r) => service.deleteCategory(principal(r), id(r))),
    adminProducts: action((r) => service.adminProducts(principal(r), page(r))),
    createProduct: action(
      (r) => service.saveProduct(principal(r), v.productSchema.parse(r.body)),
      201
    ),
    updateProduct: action((r) =>
      service.saveProduct(principal(r), v.productSchema.parse(r.body), id(r))
    ),
    createVariant: action(
      (r) => service.saveVariant(principal(r), id(r, "productId"), v.variantSchema.parse(r.body)),
      201
    ),
    updateVariant: action((r) =>
      service.saveVariant(principal(r), id(r, "productId"), v.variantSchema.parse(r.body), id(r))
    ),
    stock: action((r) => service.adjustStock(principal(r), id(r), v.stockSchema.parse(r.body))),
    lowStock: action((r) => service.lowStock(principal(r), page(r))),
    wholesale: action((r) =>
      service.wholesale(principal(r), id(r), v.wholesaleSchema.parse(r.body).approved)
    ),
    quote: action((r) => service.quote(principal(r), id(r), v.quoteSchema.parse(r.query).quantity)),
    wishlist: action((r) => service.collection(principal(r), "wishlist", page(r))),
    saveWishlist: action((r) => service.saveCollection(principal(r), "wishlist", id(r))),
    deleteWishlist: action((r) => service.saveCollection(principal(r), "wishlist", id(r), true)),
    recent: action((r) => service.collection(principal(r), "recent", page(r))),
    saveRecent: action((r) => service.saveCollection(principal(r), "recent", id(r))),
    deleteRecent: action((r) => service.saveCollection(principal(r), "recent", id(r), true)),
    reviews: action((r) => service.reviews(id(r), page(r))),
    saveReview: action((r) =>
      service.saveReview(principal(r), id(r), v.reviewSchema.parse(r.body))
    ),
    deleteReview: action((r) => service.deleteReview(principal(r), id(r))),
    moderationQueue: action((r) => service.moderationQueue(principal(r), page(r))),
    moderate: action((r) =>
      service.moderate(principal(r), id(r), v.moderationSchema.parse(r.body).status)
    ),
    cms: action((r) => service.cms(page(r))),
    adminCms: action((r) => service.adminCms(principal(r), page(r))),
    createCms: action((r) => service.saveCms(principal(r), v.cmsSchema.parse(r.body)), 201),
    updateCms: action((r) => service.saveCms(principal(r), v.cmsSchema.parse(r.body), id(r))),
    csvImport: action((r) => service.csvImport(principal(r), v.importSchema.parse(r.body))),
    csvExport: asyncHandler(async (r, res) => {
      const csv = await service.csvExport(principal(r), page(r));
      res.type("text/csv").attachment("catalog.csv").send(csv);
    })
  };
};
