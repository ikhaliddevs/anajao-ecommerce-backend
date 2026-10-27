import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { parseCsv, importRows, exportCsv, csvHeaders } from "../src/modules/catalog/catalog.csv.js";
import { effectivePrice, quotePrice } from "../src/modules/catalog/catalog.pricing.js";
import * as v from "../src/modules/catalog/catalog.validation.js";

describe("catalogue validation and pricing", () => {
  it("normalizes SKUs and options and rejects stock/client privilege injection", () => {
    const result = v.variantSchema.parse({ sku: " shirt-l ", size: " L ", priceMinor: 100 });
    expect(result.sku).toBe("SHIRT-L");
    expect(result.size).toBe("l");
    expect(() => v.variantSchema.parse({ sku: "A", priceMinor: 1, stock: 100 })).toThrow();
    expect(() =>
      v.productSchema.parse({
        name: "A",
        slug: "a",
        categoryId: randomUUID(),
        description: "",
        wholesaleApproved: true
      })
    ).toThrow();
  });
  it("rejects invalid sale windows, tiers, preorder dates and unsafe URLs", () => {
    for (const input of [
      { salePriceMinor: 50 },
      { stockPolicy: "PREORDER" },
      {
        tiers: [
          { minQuantity: 5, priceMinor: 90 },
          { minQuantity: 5, priceMinor: 80 }
        ]
      },
      { tiers: [{ minQuantity: 2, priceMinor: 200 }] }
    ])
      expect(() => v.variantSchema.parse({ sku: "A", priceMinor: 100, ...input })).toThrow();
    expect(() =>
      v.productSchema.parse({
        name: "A",
        slug: "a",
        categoryId: randomUUID(),
        description: "",
        images: [{ url: "javascript:alert(1)", alt: "" }]
      })
    ).toThrow();
    expect(() =>
      v.cmsSchema.parse({
        slug: "a",
        kind: "BANNER",
        title: "A",
        body: "",
        targetPath: "//evil.example"
      })
    ).toThrow();
  });
  it("enforces pagination and literal bounded searches", () => {
    expect(() => v.searchSchema.parse({ limit: 51 })).toThrow();
    expect(() => v.searchSchema.parse({ page: 101 })).toThrow();
    expect(() => v.searchSchema.parse({ minPrice: 100, maxPrice: 10 })).toThrow();
    expect(() => v.searchSchema.parse({ sort: "price;DROP TABLE Product" })).toThrow();
    expect(v.searchSchema.parse({}).currency).toBe("NGN");
  });
  it("uses inclusive sale start and exclusive end without floating point amounts", () => {
    const item = {
      priceMinor: 199,
      salePriceMinor: 99,
      saleStartsAt: new Date("2030-01-01"),
      saleEndsAt: new Date("2030-01-02")
    };
    expect(effectivePrice(item, new Date("2029-12-31"))).toBe(199);
    expect(effectivePrice(item, new Date("2030-01-01"))).toBe(99);
    expect(effectivePrice(item, new Date("2030-01-02"))).toBe(199);
  });
  it("restricts quantity tiers to approved accounts and does not reserve stock", () => {
    const variant = {
      id: randomUUID(),
      productId: randomUUID(),
      stock: 1,
      ...v.variantSchema.parse({
        sku: "A",
        priceMinor: 100,
        tiers: [{ minQuantity: 5, priceMinor: 70 }]
      }),
      tiers: [{ id: randomUUID(), variantId: randomUUID(), minQuantity: 5, priceMinor: 70 }]
    };
    expect(quotePrice(variant, 5, false)).toMatchObject({
      unitPriceMinor: 100,
      totalPriceMinor: 500,
      available: false
    });
    expect(quotePrice(variant, 5, true)).toMatchObject({
      unitPriceMinor: 70,
      totalPriceMinor: 350
    });
    expect(quotePrice({ ...variant, stockPolicy: "BACKORDER" }, 5, false).available).toBe(true);
    expect(variant.stock).toBe(1);
  });
});

describe("CSV safety", () => {
  const header = csvHeaders.join(",") + "\r\n";
  it("parses quoted commas/newlines and escaped quotes", () => {
    const source =
      header + 'shirt,"A, B\nC ""quoted""",' + randomUUID() + ",SKU,l,blue,regular,123\r\n";
    expect(parseCsv(source)[0]?.[1]).toBe('A, B\nC "quoted"');
    expect(importRows(source)[0]?.variant.priceMinor).toBe(123);
  });
  it("rejects malformed CSV, formulas, excess rows and invalid numbers", () => {
    const row = `shirt,Shirt,${randomUUID()},SKU,l,blue,regular,123\n`;
    for (const source of [
      header + '"unfinished',
      header + row.repeat(101),
      header + row.replace("Shirt", " =cmd()"),
      header + row.replace("123", "1e6"),
      "bad,headers\n1,2"
    ])
      expect(() => importRows(source)).toThrow();
  });
  it("neutralizes spreadsheet formulas including leading whitespace", () => {
    const output = exportCsv([["=1+1", " +cmd", "@SUM(1)", "-1", "\t=1", 'a"b', "safe", 10]]);
    expect(output).toContain('"\'=1+1"');
    expect(output).toContain('"\' +cmd"');
    expect(output).toContain('"a""b"');
  });
});
