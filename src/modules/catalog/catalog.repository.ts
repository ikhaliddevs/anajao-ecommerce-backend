import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";
import type { Principal } from "../identity/identity.service.js";
import type { SearchInput } from "./catalog.validation.js";

export const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  variants: { include: { tiers: true }, orderBy: { sku: "asc" as const } }
};
export type CatalogProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
export type CatalogTransaction = Prisma.TransactionClient;
const denied = () => new AppError("Access denied", 403, "FORBIDDEN");

export class CatalogRepository {
  constructor(readonly db: PrismaClient) {}
  async transaction<T>(
    principal: Principal,
    admin: boolean,
    work: (tx: CatalogTransaction, wholesale: boolean) => Promise<T>
  ): Promise<T> {
    try {
      return await this.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM User WHERE id = ${principal.userId} FOR UPDATE`;
          const user = await tx.user.findUnique({ where: { id: principal.userId } });
          const session = await tx.session.findUnique({ where: { id: principal.sessionId } });
          if (
            !user ||
            user.status !== "ACTIVE" ||
            !user.emailVerifiedAt ||
            !session ||
            session.userId !== user.id ||
            session.revokedAt ||
            session.expiresAt <= new Date()
          )
            throw new AppError("Authentication required", 401, "UNAUTHORIZED");
          if (
            admin &&
            (user.role !== "ADMIN" ||
              !session.mfaVerified ||
              !(await tx.mfaFactor.findUnique({ where: { userId: user.id } }))?.confirmedAt)
          )
            throw denied();
          // One lock keeps category trees, cross-row uniqueness preflight and imports coherent.
          // Lock order is account -> catalogue; identity operations only lock accounts.
          const locks = await tx.$queryRaw<
            { id: number }[]
          >`SELECT id FROM CatalogLock WHERE id = 1 FOR UPDATE`;
          if (locks.length !== 1)
            throw new AppError("Catalogue migration is incomplete", 503, "CATALOG_UNAVAILABLE");
          return work(tx, user.wholesaleApproved);
        },
        {
          maxWait: 5000,
          timeout: 15000,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
        }
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new AppError("A unique catalogue value already exists", 409, "CONFLICT");
        if (["P2003", "P2025"].includes(error.code))
          throw new AppError("Related record is missing or still in use", 409, "CONFLICT");
        if (error.code === "P2034")
          throw new AppError("Concurrent update; retry the request", 409, "CONFLICT");
      }
      throw error;
    }
  }
  async search(input: SearchInput, now: Date) {
    const price = Prisma.sql`CASE WHEN v.salePriceMinor IS NOT NULL AND v.saleStartsAt <= ${now} AND v.saleEndsAt > ${now} THEN v.salePriceMinor ELSE v.priceMinor END`;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`p.status = 'PUBLISHED'`,
      Prisma.sql`v.active = true`,
      Prisma.sql`p.currency = ${input.currency}`
    ];
    // SQL wildcards are not accepted as search operators; bound values prevent SQL injection.
    if (input.q) {
      const literal = input.q.replace(/[!%_]/g, (char) => "!" + char);
      conditions.push(
        Prisma.sql`(p.name LIKE ${"%" + literal + "%"} ESCAPE '!' OR p.slug LIKE ${"%" + literal + "%"} ESCAPE '!')`
      );
    }
    if (input.categoryId) conditions.push(Prisma.sql`p.categoryId = ${input.categoryId}`);
    if (input.size) conditions.push(Prisma.sql`v.size = ${input.size.toLowerCase()}`);
    if (input.colour) conditions.push(Prisma.sql`v.colour = ${input.colour.toLowerCase()}`);
    if (input.style) conditions.push(Prisma.sql`v.style = ${input.style.toLowerCase()}`);
    if (input.minPrice !== undefined) conditions.push(Prisma.sql`${price} >= ${input.minPrice}`);
    if (input.maxPrice !== undefined) conditions.push(Prisma.sql`${price} <= ${input.maxPrice}`);
    if (input.inStock)
      conditions.push(input.inStock === "true" ? Prisma.sql`v.stock > 0` : Prisma.sql`v.stock = 0`);
    const where = Prisma.join(conditions, " AND ");
    const order = {
      newest: Prisma.sql`p.createdAt DESC, p.id ASC`,
      name: Prisma.sql`p.name ASC, p.id ASC`,
      price_asc: Prisma.sql`MIN(${price}) ASC, p.id ASC`,
      price_desc: Prisma.sql`MIN(${price}) DESC, p.id ASC`
    }[input.sort];
    const rows = await this.db.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT p.id FROM Product p JOIN ProductVariant v ON v.productId = p.id WHERE ${where} GROUP BY p.id ORDER BY ${order} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}`
    );
    const counts = await this.db.$queryRaw<{ total: bigint }[]>(
      Prisma.sql`SELECT COUNT(DISTINCT p.id) AS total FROM Product p JOIN ProductVariant v ON v.productId = p.id WHERE ${where}`
    );
    const products = await this.db.product.findMany({
      where: { id: { in: rows.map((r) => r.id) }, status: "PUBLISHED" },
      include: productInclude
    });
    return {
      items: rows.flatMap((row) => {
        const item = products.find((p) => p.id === row.id);
        return item ? [item] : [];
      }),
      total: Number(counts[0]?.total ?? 0),
      page: input.page,
      limit: input.limit
    };
  }
}
