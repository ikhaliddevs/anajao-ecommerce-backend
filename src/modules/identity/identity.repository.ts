import type { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import type { ChallengeKind } from "../../generated/prisma/enums.js";
import { AppError } from "../../common/errors/app-error.js";

// The service depends on this repository boundary; all security-sensitive mutations
// serialize on the account row, including challenge use and token rotation.
export class IdentityStore {
  constructor(private readonly db: Prisma.TransactionClient) {}
  user(id: string) {
    return this.db.user.findUniqueOrThrow({ where: { id } });
  }
  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({ where: { id }, data });
  }
  session(id: string) {
    return this.db.session.findUnique({ where: { id } });
  }
  sessionByHash(tokenHash: string) {
    return this.db.session.findUnique({ where: { tokenHash } });
  }
  createSession(data: Prisma.SessionUncheckedCreateInput) {
    return this.db.session.create({ data });
  }
  revokeSession(id: string) {
    return this.db.session.update({ where: { id }, data: { revokedAt: new Date() } });
  }
  revokeAll(userId: string) {
    return this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
  revokeFamily(familyId: string) {
    return this.db.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
  challenge(tokenHash: string) {
    return this.db.challenge.findUnique({ where: { tokenHash } });
  }
  invalidateChallenges(userId: string, kind: ChallengeKind) {
    return this.db.challenge.updateMany({
      where: { userId, kind, usedAt: null },
      data: { usedAt: new Date() }
    });
  }
  createChallenge(data: Prisma.ChallengeUncheckedCreateInput) {
    return this.db.challenge.create({ data });
  }
  consumeChallenge(id: string) {
    return this.db.challenge.update({ where: { id }, data: { usedAt: new Date() } });
  }
  factor(userId: string) {
    return this.db.mfaFactor.findUnique({ where: { userId } });
  }
  saveFactor(userId: string, encryptedSecret: string) {
    return this.db.mfaFactor.upsert({
      where: { userId },
      create: { userId, encryptedSecret },
      update: { encryptedSecret, confirmedAt: null, lastUsedStep: -1 }
    });
  }
  confirmFactor(userId: string, step: number) {
    return this.db.mfaFactor.update({
      where: { userId },
      data: { confirmedAt: new Date(), lastUsedStep: step }
    });
  }
  audit(userId: string, action: string) {
    return this.db.auditEvent.create({ data: { userId, action } });
  }
  addresses(userId: string) {
    return this.db.address.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100
    });
  }
  createAddress(data: Prisma.AddressUncheckedCreateInput) {
    return this.db.address.create({ data });
  }
  deleteAddress(userId: string, id: string) {
    return this.db.address.deleteMany({ where: { userId, id } });
  }
  privacy(userId: string, kind: string) {
    return this.db.privacyRequest.upsert({
      where: { userId_kind_status: { userId, kind, status: "PENDING" } },
      create: { userId, kind },
      update: {}
    });
  }
}

export class IdentityRepository {
  constructor(private readonly db: PrismaClient) {}
  async findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }
  async findSession(tokenHash: string) {
    return this.db.session.findUnique({ where: { tokenHash } });
  }
  async findChallenge(tokenHash: string) {
    return this.db.challenge.findUnique({ where: { tokenHash } });
  }
  async createUser(data: { email: string; name: string; passwordHash: string }) {
    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await tx.auditEvent.create({ data: { userId: user.id, action: "ACCOUNT_REGISTERED" } });
      return user;
    });
  }
  locked<T>(userId: string, work: (store: IdentityStore) => Promise<T>): Promise<T> {
    return this.db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
        if (!rows.length) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
        return work(new IdentityStore(tx));
      },
      { maxWait: 5000, timeout: 10000 }
    );
  }
}

export type IdentityRepositoryPort = Pick<
  IdentityRepository,
  "findByEmail" | "findSession" | "findChallenge" | "createUser" | "locked"
>;
