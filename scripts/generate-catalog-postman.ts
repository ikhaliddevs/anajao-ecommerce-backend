import { writeFileSync } from "node:fs";
import { catalogOperations } from "../src/modules/catalog/catalog.operations.js";

const bodies = {
  category: { slug: "shirts", name: "Shirts", parentId: null },
  product: {
    slug: "cotton-shirt",
    name: "Cotton Shirt",
    description: "Plain cotton shirt",
    categoryId: "{{categoryId}}",
    status: "DRAFT",
    kind: "PHYSICAL",
    currency: "NGN",
    images: [{ url: "https://example.com/shirt.jpg", alt: "Blue shirt" }]
  },
  variant: {
    sku: "SHIRT-BLUE-L",
    size: "l",
    colour: "blue",
    style: "regular",
    priceMinor: 2500000,
    lowStockThreshold: 5,
    stockPolicy: "DENY",
    tiers: [{ minQuantity: 10, priceMinor: 2000000 }]
  },
  stock: { delta: 20, reason: "Opening receipt", idempotencyKey: "{{$guid}}" },
  wholesale: { approved: true },
  review: { rating: 5, body: "Comfortable shirt" },
  moderation: { status: "APPROVED" },
  cms: {
    slug: "welcome",
    kind: "BANNER",
    title: "New collection",
    body: "Explore our shirts",
    targetPath: "/shirts",
    published: true
  },
  import: {
    dryRun: true,
    csv: "productSlug,name,categoryId,sku,size,colour,style,priceMinor\r\nimport-shirt,Imported shirt,{{categoryId}},IMPORT-BLUE-M,m,blue,regular,1500000\r\n",
    idempotencyKey: "{{$guid}}"
  }
};
const idVariable = (key: string) => {
  if (/Category/.test(key)) return "categoryId";
  if (["stock", "quote", "updateVariant"].includes(key)) return "variantId";
  if (key === "wholesale") return "userId";
  if (key === "moderate") return "reviewId";
  if (key === "updateCms") return "contentId";
  return "productId";
};
const captures: Record<string, string> = {
  createCategory: "categoryId",
  createProduct: "productId",
  createVariant: "variantId",
  saveReview: "reviewId",
  createCms: "contentId"
};
const items = catalogOperations.map((op) => {
  const path = op.path
    .replace(":productId", "{{productId}}")
    .replace(":id", `{{${idVariable(op.key)}}}`);
  const query =
    op.query === "page"
      ? "?page=1&limit=20"
      : op.query === "search"
        ? "?currency=NGN&page=1&limit=20&sort=newest"
        : op.query === "quote"
          ? "?quantity=10"
          : "";
  const request = {
    method: op.method.toUpperCase(),
    header: [
      { key: "Content-Type", value: "application/json" },
      ...(op.access === "public"
        ? []
        : [
            {
              key: "Authorization",
              value:
                op.access === "admin" ? "Bearer {{adminAccessToken}}" : "Bearer {{accessToken}}"
            }
          ])
    ],
    url: `{{baseUrl}}/api/v1${path}${query}`,
    description: `${op.access} access. See docs/catalog-inventory.md for sequence and prerequisites. PUT requests replace the complete editable resource.`,
    ...(op.body
      ? {
          body: {
            mode: "raw",
            raw: JSON.stringify(bodies[op.body], null, 2),
            options: { raw: { language: "json" } }
          }
        }
      : {})
  };
  const exec = [
    `pm.test('Expected status', () => pm.response.to.have.status(${op.status ?? 200}));`
  ];
  if (op.key === "csvExport")
    exec.push(
      "pm.test('CSV response', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('text/csv')); "
    );
  else {
    exec.push(
      "const body = pm.response.json();",
      "pm.test('Success envelope', () => pm.expect(body.success).to.eql(true));",
      "pm.test('No credentials', () => pm.expect(pm.response.text()).not.to.match(/passwordHash|tokenHash|encryptedSecret/));"
    );
    if (op.access === "public")
      exec.push(
        "pm.test('No private catalogue fields', () => pm.expect(pm.response.text()).not.to.match(/digitalAssetKey|wholesaleApproved|\"tiers\"/));"
      );
    if (captures[op.key])
      exec.push(`if (body.success) pm.environment.set('${captures[op.key]}', body.data.id);`);
    if (op.key === "csvImport")
      exec.push("pm.test('Preview valid', () => pm.expect(body.data.valid).to.eql(true));");
  }
  return {
    name: `${op.key}: ${request.method} ${op.path}`,
    request,
    event: [{ listen: "test", script: { type: "text/javascript", exec } }]
  };
});
const negatives = [
  { name: "Missing admin token", path: "/admin/catalog/products", status: 401 },
  { name: "Customer denied admin", path: "/admin/catalog/products", status: 403, auth: true },
  { name: "Pagination limit rejected", path: "/catalog/products?limit=500", status: 400 },
  { name: "Invalid product ID", path: "/catalog/products/not-a-uuid", status: 400 }
].map((test) => ({
  name: test.name,
  request: {
    method: "GET",
    url: `{{baseUrl}}/api/v1${test.path}`,
    header: test.auth ? [{ key: "Authorization", value: "Bearer {{accessToken}}" }] : []
  },
  event: [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          `pm.test('Expected denial', () => pm.response.to.have.status(${test.status}));`,
          "pm.test('Error envelope', () => pm.expect(pm.response.json().success).to.eql(false));"
        ]
      }
    }
  ]
}));
writeFileSync(
  "postman/anajao-milestone-03.postman_collection.json",
  JSON.stringify(
    {
      info: {
        name: "Anajao Milestone 3 - Catalogue and inventory",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        description:
          "Manual sequence in docs/catalog-inventory.md. Requires verified customer and MFA-authenticated administrator. Not a run-all collection; credentials are not included."
      },
      item: [
        { name: "Catalogue operations", item: items },
        { name: "Negative cases", item: negatives }
      ]
    },
    null,
    2
  ) + "\n"
);
writeFileSync(
  "postman/anajao-milestone-03.postman_environment.json",
  JSON.stringify(
    {
      name: "Anajao local catalogue",
      _postman_variable_scope: "environment",
      values: [
        { key: "baseUrl", value: "http://localhost:3000", enabled: true },
        ...[
          "accessToken",
          "adminAccessToken",
          "categoryId",
          "productId",
          "variantId",
          "userId",
          "reviewId",
          "contentId"
        ].map((key) => ({ key, value: "", enabled: true, type: "secret" }))
      ]
    },
    null,
    2
  ) + "\n"
);
console.log(
  `Generated ${items.length + negatives.length} catalogue Postman requests and empty-secret environment`
);
