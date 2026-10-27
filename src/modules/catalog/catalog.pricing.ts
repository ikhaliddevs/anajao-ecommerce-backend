import type { ProductVariant, PriceTier } from "../../generated/prisma/client.js";
export const effectivePrice = (
  variant: Pick<ProductVariant, "priceMinor" | "salePriceMinor" | "saleStartsAt" | "saleEndsAt">,
  now = new Date()
) =>
  variant.salePriceMinor !== null &&
  variant.saleStartsAt &&
  variant.saleEndsAt &&
  variant.saleStartsAt <= now &&
  now < variant.saleEndsAt
    ? variant.salePriceMinor
    : variant.priceMinor;
export const quotePrice = (
  variant: ProductVariant & { tiers: PriceTier[] },
  quantity: number,
  wholesaleApproved: boolean,
  now = new Date()
) => {
  const retail = effectivePrice(variant, now);
  const eligible = wholesaleApproved
    ? variant.tiers.filter((tier) => tier.minQuantity <= quantity)
    : [];
  const unitPriceMinor = Math.min(retail, ...eligible.map((tier) => tier.priceMinor));
  const available =
    variant.stock >= quantity ||
    variant.stockPolicy === "BACKORDER" ||
    variant.stockPolicy === "PREORDER";
  return {
    quantity,
    unitPriceMinor,
    totalPriceMinor: unitPriceMinor * quantity,
    wholesaleApplied: unitPriceMinor < retail,
    available,
    stockPolicy: variant.stockPolicy,
    preorderAvailableAt: variant.preorderAvailableAt
  };
};
