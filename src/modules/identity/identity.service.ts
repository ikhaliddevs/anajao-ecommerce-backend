import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import type { AppEnv } from "../../config/env.js";
import type { User } from "../../generated/prisma/client.js";
import type { ChallengeKind } from "../../generated/prisma/enums.js";
import {
  digest,
  hashPassword,
  IdentityCrypto,
  newToken,
  verifyPassword
} from "./identity.crypto.js";
import type { IdentityRepositoryPort, IdentityStore } from "./identity.repository.js";
import type { ChallengeDelivery } from "./identity.providers.js";
import type { addressSchema, profileSchema, registerSchema } from "./identity.validation.js";

export type Principal = {
  userId: string;
  sessionId: string;
  role: User["role"];
  mfaVerified: boolean;
};
export const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt,
  phoneVerifiedAt: user.phoneVerifiedAt
});
const invalid = () => new AppError("Invalid credentials or token", 401, "UNAUTHORIZED");
const accepted = { message: "If the account is eligible, instructions will be sent" };
const active = (user: User) => user.status === "ACTIVE" && user.emailVerifiedAt !== null;

export class IdentityService {
  readonly crypto: IdentityCrypto;
  private dummyHash?: Promise<string>;
  constructor(
    private readonly repo: IdentityRepositoryPort,
    private readonly env: AppEnv,
    private readonly delivery: ChallengeDelivery
  ) {
    this.crypto = new IdentityCrypto(env);
  }

  async register(input: z.infer<typeof registerSchema>) {
    const passwordHash = await hashPassword(input.password);
    try {
      await this.repo.createUser({ email: input.email, name: input.name, passwordHash });
    } catch (error) {
      if (!(
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ))
        throw error;
    }
    // Same response for new and existing addresses. Explicit resend delivers the challenge.
    return accepted;
  }

  async login(email: string, password: string, mfaCode?: string) {
    const found = await this.repo.findByEmail(email);
    if (!found) {
      this.dummyHash ??= hashPassword(newToken());
      await verifyPassword(await this.dummyHash, password);
      throw invalid();
    }
    const result = await this.repo.locked(found.id, async (store) => {
      let user = await store.user(found.id);
      if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil <= new Date()) {
        user = await store.updateUser(user.id, {
          status: user.emailVerifiedAt ? "ACTIVE" : "PENDING_VERIFICATION",
          failedLogins: 0,
          lockedUntil: null
        });
      }
      const correct = await verifyPassword(user.passwordHash, password);
      if (!correct || !active(user)) {
        if (user.status !== "DISABLED" && user.status !== "LOCKED") {
          const attempts = user.failedLogins + 1;
          await store.updateUser(user.id, {
            failedLogins: attempts,
            ...(attempts >= 5
              ? { status: "LOCKED", lockedUntil: new Date(Date.now() + 900000) }
              : {})
          });
          if (attempts >= 5) await store.revokeAll(user.id);
        }
        await store.audit(user.id, "LOGIN_REJECTED");
        return null;
      }
      let mfaVerified = false;
      const factor = await store.factor(user.id);
      if (factor?.confirmedAt) {
        const step = mfaCode
          ? this.crypto.mfaStep(this.crypto.decrypt(factor.encryptedSecret), mfaCode)
          : null;
        if (step === null || step <= factor.lastUsedStep) {
          const attempts = user.failedLogins + 1;
          await store.updateUser(user.id, {
            failedLogins: attempts,
            ...(attempts >= 5
              ? { status: "LOCKED", lockedUntil: new Date(Date.now() + 900000) }
              : {})
          });
          if (attempts >= 5) await store.revokeAll(user.id);
          await store.audit(user.id, "MFA_REJECTED");
          return null;
        }
        await store.confirmFactor(user.id, step);
        mfaVerified = true;
      }
      await store.updateUser(user.id, { failedLogins: 0, lockedUntil: null });
      await store.audit(user.id, "LOGIN_SUCCEEDED");
      return this.issue(store, user.id, randomUUID(), mfaVerified);
    });
    if (!result) throw invalid();
    return result;
  }

  private async issue(
    store: IdentityStore,
    userId: string,
    familyId: string,
    mfaVerified: boolean,
    expiresAt = new Date(Date.now() + this.env.refreshTtlSeconds * 1000)
  ) {
    const refreshToken = newToken();
    const session = await store.createSession({
      userId,
      familyId,
      tokenHash: digest(refreshToken),
      mfaVerified,
      expiresAt
    });
    return {
      accessToken: await this.crypto.sign(userId, session.id),
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.env.accessTtlSeconds
    };
  }

  async refresh(token: string) {
    const found = await this.repo.findSession(digest(token));
    if (!found) throw invalid();
    const result = await this.repo.locked(found.userId, async (store) => {
      const session = await store.session(found.id);
      const user = await store.user(found.userId);
      if (!session || session.revokedAt || session.expiresAt <= new Date() || !active(user)) {
        await store.revokeFamily(found.familyId);
        await store.audit(user.id, "REFRESH_REJECTED");
        return null;
      }
      await store.revokeSession(session.id);
      await store.audit(user.id, "SESSION_ROTATED");
      return this.issue(store, user.id, session.familyId, session.mfaVerified, session.expiresAt);
    });
    if (!result) throw invalid();
    return result;
  }

  async authenticate(token: string): Promise<Principal> {
    let claims: { userId: string; sessionId: string };
    try {
      claims = await this.crypto.verify(token);
    } catch {
      throw invalid();
    }
    return this.repo.locked(claims.userId, async (store) => {
      const session = await store.session(claims.sessionId);
      const user = await store.user(claims.userId);
      if (
        !session ||
        session.userId !== user.id ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        !active(user)
      )
        throw invalid();
      return { ...claims, role: user.role, mfaVerified: session.mfaVerified };
    });
  }

  async logout(token: string) {
    const found = await this.repo.findSession(digest(token));
    if (found)
      await this.repo.locked(found.userId, async (store) => {
        await store.revokeFamily(found.familyId);
        await store.audit(found.userId, "LOGOUT");
      });
    return { message: "Logged out" };
  }

  async withPrincipal<T>(
    principal: Principal,
    work: (store: IdentityStore, user: User) => Promise<T>
  ) {
    return this.repo.locked(principal.userId, async (store) => {
      const user = await store.user(principal.userId);
      const session = await store.session(principal.sessionId);
      if (
        !active(user) ||
        !session ||
        session.userId !== user.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw invalid();
      return work(store, user);
    });
  }
  me(principal: Principal) {
    return this.withPrincipal(principal, (_store, user) => Promise.resolve(publicUser(user)));
  }
  logoutAll(principal: Principal) {
    return this.withPrincipal(principal, async (store, user) => {
      await store.revokeAll(user.id);
      await store.audit(user.id, "LOGOUT_ALL");
      return { message: "All sessions revoked" };
    });
  }

  async requestChallenge(email: string, kind: ChallengeKind) {
    const user = await this.repo.findByEmail(email);
    if (!user) return accepted;
    await this.repo
      .locked(user.id, async (store) => {
        const current = await store.user(user.id);
        if (
          current.status === "DISABLED" ||
          (current.status === "LOCKED" && (kind !== "PASSWORD_RESET" || !current.lockedUntil)) ||
          (kind === "EMAIL_VERIFICATION" && current.emailVerifiedAt) ||
          (kind === "PHONE_VERIFICATION" &&
            (!active(current) || !current.phone || current.phoneVerifiedAt))
        )
          return;
        const token = newToken();
        const expiresAt = new Date(Date.now() + (kind === "PASSWORD_RESET" ? 1800000 : 86400000));
        const target = kind === "PHONE_VERIFICATION" ? current.phone! : current.email;
        await store.invalidateChallenges(user.id, kind);
        await store.createChallenge({
          userId: user.id,
          kind,
          target,
          tokenHash: digest(token),
          expiresAt
        });
        // Preparation boundary: never expose a secret in the API. If delivery fails,
        // roll back the challenge and return the same non-enumerating public response.
        try {
          await this.delivery.send({ destination: target, kind, token, expiresAt });
        } catch {
          throw new AppError(
            "Verification delivery is not configured or unavailable",
            503,
            "DELIVERY_UNAVAILABLE"
          );
        }
        await store.audit(user.id, "CHALLENGE_REQUESTED");
      })
      .catch((error: unknown) => {
        if (!(error instanceof AppError && error.code === "DELIVERY_UNAVAILABLE")) throw error;
      });
    return accepted;
  }

  async consumeChallenge(token: string, kind: ChallengeKind, password?: string) {
    const found = await this.repo.findChallenge(digest(token));
    if (!found) throw invalid();
    const passwordHash = password ? await hashPassword(password) : undefined;
    await this.repo.locked(found.userId, async (store) => {
      const challenge = await store.challenge(digest(token));
      const user = await store.user(found.userId);
      if (
        !challenge ||
        challenge.kind !== kind ||
        challenge.usedAt ||
        challenge.expiresAt <= new Date() ||
        user.status === "DISABLED" ||
        (user.status === "LOCKED" && (kind !== "PASSWORD_RESET" || !user.lockedUntil)) ||
        challenge.target !== (kind === "PHONE_VERIFICATION" ? user.phone : user.email)
      )
        throw invalid();
      await store.consumeChallenge(challenge.id);
      await store.invalidateChallenges(user.id, kind);
      if (kind === "PASSWORD_RESET") {
        if (!passwordHash) throw invalid();
        await store.updateUser(user.id, {
          passwordHash,
          failedLogins: 0,
          lockedUntil: null,
          status:
            user.status === "LOCKED"
              ? user.emailVerifiedAt
                ? "ACTIVE"
                : "PENDING_VERIFICATION"
              : user.status
        });
        await store.revokeAll(user.id);
      } else if (kind === "EMAIL_VERIFICATION")
        await store.updateUser(user.id, { emailVerifiedAt: new Date(), status: "ACTIVE" });
      else await store.updateUser(user.id, { phoneVerifiedAt: new Date() });
      await store.audit(user.id, `${kind}_COMPLETED`);
    });
    return { message: "Request completed" };
  }

  profile(principal: Principal, input: z.infer<typeof profileSchema>) {
    return this.withPrincipal(principal, async (store, user) => {
      if (input.phone !== undefined && input.phone !== user.phone)
        await store.invalidateChallenges(user.id, "PHONE_VERIFICATION");
      const updated = await store.updateUser(user.id, {
        ...input,
        ...(input.phone !== undefined && input.phone !== user.phone
          ? { phoneVerifiedAt: null }
          : {})
      });
      await store.audit(user.id, "PROFILE_UPDATED");
      return publicUser(updated);
    });
  }
  addresses(principal: Principal) {
    return this.withPrincipal(principal, (store, user) => store.addresses(user.id));
  }
  addAddress(principal: Principal, input: z.infer<typeof addressSchema>) {
    return this.withPrincipal(principal, async (store, user) => {
      if ((await store.addresses(user.id)).length >= 100)
        throw new AppError("Address limit reached", 409, "ADDRESS_LIMIT");
      const result = await store.createAddress({ ...input, userId: user.id });
      await store.audit(user.id, "ADDRESS_CREATED");
      return result;
    });
  }
  deleteAddress(principal: Principal, id: string) {
    return this.withPrincipal(principal, async (store, user) => {
      if (!(await store.deleteAddress(user.id, id)).count)
        throw new AppError("Address not found", 404, "NOT_FOUND");
      await store.audit(user.id, "ADDRESS_DELETED");
      return { message: "Address deleted" };
    });
  }
  privacy(principal: Principal, kind: "EXPORT" | "DELETE") {
    return this.withPrincipal(principal, async (store, user) => {
      const result = await store.privacy(user.id, kind);
      if (kind === "DELETE") {
        await store.updateUser(user.id, { status: "DISABLED" });
        await store.revokeAll(user.id);
      }
      await store.audit(user.id, `PRIVACY_${kind}_REQUESTED`);
      return result;
    });
  }
  setupMfa(principal: Principal, password: string) {
    return this.withPrincipal(principal, async (store, user) => {
      if (user.role !== "ADMIN") throw new AppError("Forbidden", 403, "FORBIDDEN");
      if (!(await verifyPassword(user.passwordHash, password))) throw invalid();
      if ((await store.factor(user.id))?.confirmedAt)
        throw new AppError("MFA already configured", 409, "MFA_CONFIGURED");
      const result = this.crypto.newMfa();
      await store.saveFactor(user.id, this.crypto.encrypt(result.secret));
      await store.audit(user.id, "MFA_ENROLLMENT_STARTED");
      return result;
    });
  }
  confirmMfa(principal: Principal, code: string) {
    return this.withPrincipal(principal, async (store, user) => {
      if (user.role !== "ADMIN") throw new AppError("Forbidden", 403, "FORBIDDEN");
      const factor = await store.factor(user.id);
      const step =
        factor && !factor.confirmedAt
          ? this.crypto.mfaStep(this.crypto.decrypt(factor.encryptedSecret), code)
          : null;
      if (step === null || !factor || step <= factor.lastUsedStep) throw invalid();
      await store.confirmFactor(user.id, step);
      await store.revokeAll(user.id);
      await store.audit(user.id, "MFA_ENABLED");
      return { message: "MFA enabled; sign in again with a fresh code" };
    });
  }
  adminCheck(principal: Principal) {
    return this.withPrincipal(principal, async (store, user) => {
      const session = await store.session(principal.sessionId);
      if (
        user.role !== "ADMIN" ||
        !session?.mfaVerified ||
        !(await store.factor(user.id))?.confirmedAt
      )
        throw new AppError("Privileged access requires admin role and MFA", 403, "FORBIDDEN");
      await store.audit(user.id, "ADMIN_ACCESS_CHECKED");
      return { authorized: true };
    });
  }
}
