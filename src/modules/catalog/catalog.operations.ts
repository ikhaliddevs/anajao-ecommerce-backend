import type { createCatalogController } from "./catalog.controller.js";
export type CatalogOperation = {
  key: keyof ReturnType<typeof createCatalogController>;
  method: "get" | "post" | "put" | "delete";
  path: string;
  access: "public" | "account" | "admin";
  body?:
    | "category"
    | "product"
    | "variant"
    | "stock"
    | "wholesale"
    | "review"
    | "moderation"
    | "cms"
    | "import";
  query?: "page" | "search" | "quote";
  status?: number;
};
export const catalogOperations: CatalogOperation[] = [
  { key: "search", method: "get", path: "/catalog/products", access: "public", query: "search" },
  {
    key: "suggestions",
    method: "get",
    path: "/catalog/suggestions",
    access: "public",
    query: "search"
  },
  { key: "product", method: "get", path: "/catalog/products/:id", access: "public" },
  {
    key: "categories",
    method: "get",
    path: "/catalog/categories",
    access: "public",
    query: "page"
  },
  {
    key: "reviews",
    method: "get",
    path: "/catalog/products/:id/reviews",
    access: "public",
    query: "page"
  },
  { key: "cms", method: "get", path: "/content", access: "public", query: "page" },
  {
    key: "quote",
    method: "get",
    path: "/catalog/variants/:id/quote",
    access: "account",
    query: "quote"
  },
  { key: "wishlist", method: "get", path: "/me/wishlist", access: "account", query: "page" },
  { key: "saveWishlist", method: "put", path: "/me/wishlist/:id", access: "account" },
  { key: "deleteWishlist", method: "delete", path: "/me/wishlist/:id", access: "account" },
  { key: "recent", method: "get", path: "/me/recently-viewed", access: "account", query: "page" },
  { key: "saveRecent", method: "put", path: "/me/recently-viewed/:id", access: "account" },
  { key: "deleteRecent", method: "delete", path: "/me/recently-viewed/:id", access: "account" },
  { key: "saveReview", method: "put", path: "/me/reviews/:id", access: "account", body: "review" },
  { key: "deleteReview", method: "delete", path: "/me/reviews/:id", access: "account" },
  {
    key: "createCategory",
    method: "post",
    path: "/admin/catalog/categories",
    access: "admin",
    body: "category",
    status: 201
  },
  {
    key: "updateCategory",
    method: "put",
    path: "/admin/catalog/categories/:id",
    access: "admin",
    body: "category"
  },
  {
    key: "deleteCategory",
    method: "delete",
    path: "/admin/catalog/categories/:id",
    access: "admin"
  },
  {
    key: "adminProducts",
    method: "get",
    path: "/admin/catalog/products",
    access: "admin",
    query: "page"
  },
  {
    key: "createProduct",
    method: "post",
    path: "/admin/catalog/products",
    access: "admin",
    body: "product",
    status: 201
  },
  {
    key: "updateProduct",
    method: "put",
    path: "/admin/catalog/products/:id",
    access: "admin",
    body: "product"
  },
  {
    key: "createVariant",
    method: "post",
    path: "/admin/catalog/products/:productId/variants",
    access: "admin",
    body: "variant",
    status: 201
  },
  {
    key: "updateVariant",
    method: "put",
    path: "/admin/catalog/products/:productId/variants/:id",
    access: "admin",
    body: "variant"
  },
  {
    key: "stock",
    method: "post",
    path: "/admin/catalog/variants/:id/stock-adjustments",
    access: "admin",
    body: "stock"
  },
  {
    key: "lowStock",
    method: "get",
    path: "/admin/catalog/low-stock",
    access: "admin",
    query: "page"
  },
  {
    key: "wholesale",
    method: "put",
    path: "/admin/catalog/wholesale-accounts/:id",
    access: "admin",
    body: "wholesale"
  },
  {
    key: "moderationQueue",
    method: "get",
    path: "/admin/catalog/reviews",
    access: "admin",
    query: "page"
  },
  {
    key: "moderate",
    method: "put",
    path: "/admin/catalog/reviews/:id",
    access: "admin",
    body: "moderation"
  },
  { key: "adminCms", method: "get", path: "/admin/content", access: "admin", query: "page" },
  {
    key: "createCms",
    method: "post",
    path: "/admin/content",
    access: "admin",
    body: "cms",
    status: 201
  },
  { key: "updateCms", method: "put", path: "/admin/content/:id", access: "admin", body: "cms" },
  {
    key: "csvImport",
    method: "post",
    path: "/admin/catalog/import",
    access: "admin",
    body: "import"
  },
  { key: "csvExport", method: "get", path: "/admin/catalog/export", access: "admin", query: "page" }
];
