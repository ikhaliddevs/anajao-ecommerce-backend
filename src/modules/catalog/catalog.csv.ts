import { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { productSchema, variantSchema } from "./catalog.validation.js";

export const csvHeaders = [
  "productSlug",
  "name",
  "categoryId",
  "sku",
  "size",
  "colour",
  "style",
  "priceMinor"
] as const;
const invalid = () =>
  new AppError(
    "Invalid CSV; use the documented header and at most 100 data rows",
    400,
    "INVALID_CSV"
  );
const formula = (value: string) => {
  let start = 0;
  while (start < value.length && (value.charCodeAt(start) <= 31 || /\s/.test(value[start]!)))
    start++;
  return /^[=+@-]/.test(value.slice(start));
};
// RFC 4180 quoted fields, embedded newlines and escaped quotes; no permissive trailing text.
export const parseCsv = (source: string): string[][] => {
  if (Buffer.byteLength(source, "utf8") > 200000) throw invalid();
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const cell = () => {
    row.push(field);
    field = "";
    closed = false;
    if (row.length > 8) throw invalid();
  };
  const line = () => {
    cell();
    rows.push(row);
    row = [];
    if (rows.length > 101) throw invalid();
  };
  const text = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw invalid();
      quoted = true;
    } else if (char === ",") cell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      line();
    } else {
      if (closed) throw invalid();
      field += char;
    }
  }
  if (quoted) throw invalid();
  if (field || row.length || closed) line();
  if (rows.length < 2 || rows[0]?.join(",") !== csvHeaders.join(",")) throw invalid();
  return rows.slice(1);
};
export const importRows = (source: string) =>
  parseCsv(source).map((row, index) => {
    if (row.length !== csvHeaders.length || row.some(formula))
      throw new AppError(`Unsafe or incomplete CSV row ${index + 2}`, 400, "INVALID_CSV");
    const [productSlug, name, categoryId, sku, size, colour, style, price] = row;
    if (!/^\d+$/.test(price ?? "")) throw invalid();
    try {
      return {
        product: productSchema.parse({ slug: productSlug, name, categoryId, description: "" }),
        variant: variantSchema.parse({ sku, size, colour, style, priceMinor: Number(price) })
      };
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new AppError(`Invalid CSV row ${index + 2}`, 400, "INVALID_CSV");
      throw error;
    }
  });
export const exportCsv = (rows: (string | number)[][]) =>
  [csvHeaders, ...rows]
    .map((row) =>
      row
        .map((value) => {
          let cell = String(value);
          if (formula(cell) || /^[\t\r\n]/.test(cell)) cell = "'" + cell;
          return '"' + cell.replace(/"/g, '""') + '"';
        })
        .join(",")
    )
    .join("\r\n") + "\r\n";
