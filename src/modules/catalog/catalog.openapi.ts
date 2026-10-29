import { z } from "zod";
import * as validation from "./catalog.validation.js";
import { catalogOperations } from "./catalog.operations.js";
import { catalogResponseSchemas } from "./catalog.responses.js";
export const catalogRequestSchemas = {
  category: validation.categorySchema,
  product: validation.productSchema,
  variant: validation.variantSchema,
  stock: validation.stockSchema,
  wholesale: validation.wholesaleSchema,
  review: validation.reviewSchema,
  moderation: validation.moderationSchema,
  cms: validation.cmsSchema,
  import: validation.importSchema
};
const queries = {
  page: validation.pageSchema,
  search: validation.searchSchema,
  quote: validation.quoteSchema
};
const jsonSchema = (schema: z.ZodType) => {
  const { $schema, ...result } = z.toJSONSchema(schema, { io: "input" });
  void $schema;
  return result;
};
export const catalogSchemas = Object.fromEntries([
  ...Object.entries(catalogRequestSchemas).map(
    ([name, schema]) => [`Catalog_${name}`, jsonSchema(schema)] as const
  ),
  ...Object.entries(catalogResponseSchemas).map(
    ([name, schema]) => [`CatalogResponse_${name}`, jsonSchema(schema)] as const
  )
]);
export const catalogPaths: Record<string, Record<string, unknown>> = {};
for (const op of catalogOperations) {
  const path = "/api/v1" + op.path.replace(/:([a-zA-Z]+)/g, "{$1}");
  const parameters: object[] = [...op.path.matchAll(/:([a-zA-Z]+)/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
    description: op.path.startsWith("/me/")
      ? "Product ID; ownership is derived from the session"
      : "Resource ID"
  }));
  if (op.query) {
    const schema = jsonSchema(queries[op.query]);
    for (const [name, field] of Object.entries(schema.properties ?? {}))
      parameters.push({ name, in: "query", required: false, schema: field });
  }
  catalogPaths[path] ??= {};
  catalogPaths[path][op.method] = {
    operationId: `catalog_${op.key}`,
    tags: [op.access === "admin" ? "Catalogue administration" : "Catalogue"],
    summary: op.key.replace(/([A-Z])/g, " $1"),
    description:
      op.access === "admin"
        ? "Requires current ADMIN role, confirmed MFA and an MFA-authenticated session. Rechecked inside the transaction."
        : "Prices are integer minor units. Public output excludes wholesale tiers and private digital assets. See docs/catalog-inventory.md for policies.",
    parameters,
    ...(op.access === "public" ? {} : { security: [{ bearerAuth: [] }] }),
    ...(op.body
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: `#/components/schemas/Catalog_${op.body}` } }
            }
          }
        }
      : {}),
    responses: {
      [String(op.status ?? 200)]: {
        description: "Success",
        content:
          op.key === "csvExport"
            ? { "text/csv": { schema: { type: "string" } } }
            : {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["success", "data"],
                    properties: {
                      success: { const: true },
                      data: { $ref: `#/components/schemas/CatalogResponse_${op.key}` }
                    }
                  }
                }
              }
      },
      ...Object.fromEntries(
        [400, 401, 403, 404, 409, 413, 429, 500].map((status) => [
          String(status),
          {
            description:
              "Validation, authentication, authorization, missing record, conflict, limit or server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "error"],
                  properties: {
                    success: { const: false },
                    error: {
                      type: "object",
                      required: ["code", "message"],
                      properties: { code: { type: "string" }, message: { type: "string" } }
                    }
                  }
                }
              }
            }
          }
        ])
      )
    }
  };
}
