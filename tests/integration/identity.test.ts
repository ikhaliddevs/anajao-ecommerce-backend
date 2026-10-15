import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { PrismaDatabaseClient } from "../../src/database/client.js";
import { IdentityRepository } from "../../src/modules/identity/identity.repository.js";
import { IdentityService } from "../../src/modules/identity/identity.service.js";
import { digest, newToken } from "../../src/modules/identity/identity.crypto.js";
import type { ChallengeDelivery } from "../../src/modules/identity/identity.providers.js";
import { silentLogger, testEnv } from "../helpers.js";

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith("_test"))
  throw new Error("Integration database name must end in _test");
const prefix = `m2-${randomUUID()}-`;
const password = "Isolated integration test passphrase 42!";
type Tokens = { accessToken: string; refreshToken: string };
const bodyData = <T>(response: { body: unknown }): T => (response.body as { data: T }).data;

describe.skipIf(!url)("MariaDB identity integration", () => {
  const database = new PrismaDatabaseClient(silentLogger, url);
  const messages: Parameters<ChallengeDelivery["send"]>[0][] = [];
  const delivery: ChallengeDelivery = {
    send: (message) => {
      messages.push(message);
      return Promise.resolve();
    }
  };
  const repo = new IdentityRepository(database.prisma);
  const service = new IdentityService(repo, testEnv, delivery);
  const { app } = createApp({ env: testEnv, logger: silentLogger, database, identity: service });
  const lastMessage = () => messages.at(-1)!;
  const register = async () => {
    const email = `${prefix}${randomUUID()}@example.com`;
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email, name: "Fixture Customer", password })
      .expect(202);
    return email;
  };
  const verified = async () => {
    const email = await register();
    await request(app).post("/api/v1/auth/email/resend-verification").send({ email }).expect(202);
    await request(app)
      .post("/api/v1/auth/email/verify")
      .send({ token: lastMessage().token })
      .expect(200);
    return email;
  };
  const login = async (email: string, mfaCode?: string) =>
    bodyData<Tokens>(
      await request(app).post("/api/v1/auth/login").send({ email, password, mfaCode }).expect(200)
    );
  const auth = (token: string) => `Bearer ${token}`;
  beforeAll(async () => {
    await database.connect();
  });
  afterAll(async () => {
    const users = await database.prisma.user.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true }
    });
    const ids = users.map((user) => user.id);
    await database.prisma.auditEvent.deleteMany({ where: { userId: { in: ids } } });
    await database.prisma.user.deleteMany({ where: { id: { in: ids } } });
    await database.disconnect();
  });

  it("registers pending accounts, conceals duplicates and hashes credentials", async () => {
    const email = await register();
    const first = await database.prisma.user.findUniqueOrThrow({ where: { email } });
    expect(first.status).toBe("PENDING_VERIFICATION");
    expect(first.role).toBe("CUSTOMER");
    expect(first.passwordHash).toContain("$argon2id$");
    const result = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, name: "Duplicate", password })
      .expect(202);
    expect(JSON.stringify(result.body)).not.toContain(first.id);
    expect(await database.prisma.user.count({ where: { email } })).toBe(1);
    await request(app).post("/api/v1/auth/login").send({ email, password }).expect(401);
  });
  it("rejects privilege injection, malformed input and invalid credentials", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "bad", password: "short", role: "ADMIN" })
      .expect(400);
    const email = await verified();
    await request(app).post("/api/v1/auth/login").send({ email, password: "wrong" }).expect(401);
    await request(app).get("/api/v1/me").set("Authorization", "Bearer invalid").expect(401);
  });
  it("verifies email once, rejects expired and mismatched challenges", async () => {
    const email = await register();
    await service.requestChallenge(email, "EMAIL_VERIFICATION");
    const token = lastMessage().token;
    const stored = await database.prisma.challenge.findUniqueOrThrow({
      where: { tokenHash: digest(token) }
    });
    expect(stored.tokenHash).not.toBe(token);
    await request(app).post("/api/v1/auth/password/reset").send({ token, password }).expect(401);
    await service.consumeChallenge(token, "EMAIL_VERIFICATION");
    await expect(service.consumeChallenge(token, "EMAIL_VERIFICATION")).rejects.toMatchObject({
      statusCode: 401
    });
    await service.requestChallenge(email, "PASSWORD_RESET");
    const expired = lastMessage().token;
    await database.prisma.challenge.update({
      where: { tokenHash: digest(expired) },
      data: { expiresAt: new Date(0) }
    });
    await expect(
      service.consumeChallenge(expired, "PASSWORD_RESET", password)
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("rotates refresh tokens and revokes the whole family upon reuse", async () => {
    const email = await verified();
    const first = await login(email);
    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", auth(first.accessToken))
      .expect(200);
    const rotated = bodyData<Tokens>(
      await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: first.refreshToken })
        .expect(200)
    );
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    await request(app).get("/api/v1/me").set("Authorization", auth(first.accessToken)).expect(401);
    await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
    await request(app)
      .get("/api/v1/me")
      .set("Authorization", auth(rotated.accessToken))
      .expect(401);
  });
  it("serializes concurrent refresh requests and invalidates the replayed family", async () => {
    const email = await verified();
    const tokens = await login(email);
    const results = await Promise.all(
      [service.refresh(tokens.refreshToken), service.refresh(tokens.refreshToken)].map((promise) =>
        promise.then(
          (value) => ({ value, error: false }),
          () => ({ value: undefined, error: true })
        )
      )
    );
    expect(results.filter((result) => !result.error)).toHaveLength(1);
    expect(results.filter((result) => result.error)).toHaveLength(1);
    const winner = results.find((result) => result.value)!.value!;
    await expect(service.refresh(winner.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("revokes tokens on logout and logout-all, keeping logout idempotent", async () => {
    const email = await verified();
    const first = await login(email);
    const second = await login(email);
    await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    await request(app).get("/api/v1/me").set("Authorization", auth(first.accessToken)).expect(401);
    await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", auth(second.accessToken))
      .send({})
      .expect(200);
    await expect(service.refresh(second.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("password reset is one-use, race safe and invalidates every session", async () => {
    const email = await verified();
    const tokens = await login(email);
    await service.requestChallenge(email, "PASSWORD_RESET");
    const token = lastMessage().token;
    const changed = "New integration-only passphrase 99!";
    const results = await Promise.allSettled([
      service.consumeChallenge(token, "PASSWORD_RESET", changed),
      service.consumeChallenge(token, "PASSWORD_RESET", changed)
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(service.authenticate(tokens.accessToken)).rejects.toMatchObject({
      statusCode: 401
    });
    await expect(service.refresh(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await request(app).post("/api/v1/auth/login").send({ email, password }).expect(401);
    await request(app).post("/api/v1/auth/login").send({ email, password: changed }).expect(200);
  });
  it("locks repeated failed logins, unlocks after expiry and blocks disabled accounts", async () => {
    const email = await verified();
    const tokens = await login(email);
    for (let attempt = 0; attempt < 5; attempt++)
      await request(app).post("/api/v1/auth/login").send({ email, password: "wrong" }).expect(401);
    await request(app).post("/api/v1/auth/login").send({ email, password }).expect(401);
    await expect(service.authenticate(tokens.accessToken)).rejects.toMatchObject({
      statusCode: 401
    });
    expect((await repo.findByEmail(email))?.status).toBe("LOCKED");
    await database.prisma.user.update({ where: { email }, data: { lockedUntil: new Date(0) } });
    await login(email);
    await database.prisma.user.update({ where: { email }, data: { status: "DISABLED" } });
    await request(app).post("/api/v1/auth/login").send({ email, password }).expect(401);
  });
  it("enforces ownership for profile and addresses and rejects customer admin access", async () => {
    const email = await verified();
    const tokens = await login(email);
    const other = await login(await verified());
    const result = await request(app)
      .patch("/api/v1/me")
      .set("Authorization", auth(tokens.accessToken))
      .send({ name: "Updated", phone: "+2348012345678" })
      .expect(200);
    expect(bodyData<{ name: string }>(result).name).toBe("Updated");
    await request(app)
      .patch("/api/v1/me")
      .set("Authorization", auth(tokens.accessToken))
      .send({ role: "ADMIN" })
      .expect(400);
    const created = bodyData<{ id: string }>(
      await request(app)
        .post("/api/v1/me/addresses")
        .set("Authorization", auth(tokens.accessToken))
        .send({
          label: "Home",
          recipient: "Fixture",
          line1: "1 Test Street",
          city: "Lagos",
          region: "Lagos",
          country: "NG"
        })
        .expect(201)
    );
    const list = await request(app)
      .get("/api/v1/me/addresses")
      .set("Authorization", auth(other.accessToken))
      .expect(200);
    expect(bodyData<unknown[]>(list)).toHaveLength(0);
    await request(app)
      .delete(`/api/v1/me/addresses/${created.id}`)
      .set("Authorization", auth(other.accessToken))
      .expect(404);
    await request(app)
      .delete(`/api/v1/me/addresses/${created.id}`)
      .set("Authorization", auth(tokens.accessToken))
      .expect(200);
    await request(app)
      .get("/api/v1/admin/access-check")
      .set("Authorization", auth(tokens.accessToken))
      .expect(403);
    await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", auth(tokens.accessToken))
      .send({ password })
      .expect(403);
  });
  it("binds phone verification to the current number", async () => {
    const email = await verified();
    const tokens = await login(email);
    const identity = await service.authenticate(tokens.accessToken);
    await service.profile(identity, { phone: "+2348012345678" });
    await service.requestChallenge(email, "PHONE_VERIFICATION");
    const old = lastMessage().token;
    await service.profile(identity, { phone: "+2348098765432" });
    await expect(service.consumeChallenge(old, "PHONE_VERIFICATION")).rejects.toMatchObject({
      statusCode: 401
    });
    await service.requestChallenge(email, "PHONE_VERIFICATION");
    await service.consumeChallenge(lastMessage().token, "PHONE_VERIFICATION");
    expect((await repo.findByEmail(email))?.phoneVerifiedAt).toBeInstanceOf(Date);
  });
  it("requires TOTP for admin operations, rejects reuse and encrypts factors", async () => {
    const email = await verified();
    await database.prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    const initial = await login(email);
    const identity = await service.authenticate(initial.accessToken);
    await request(app)
      .get("/api/v1/admin/access-check")
      .set("Authorization", auth(initial.accessToken))
      .expect(403);
    const setup = bodyData<{ secret: string }>(
      await request(app)
        .post("/api/v1/auth/mfa/setup")
        .set("Authorization", auth(initial.accessToken))
        .send({ password })
        .expect(200)
    );
    const factor = await database.prisma.mfaFactor.findUniqueOrThrow({
      where: { userId: identity.userId }
    });
    expect(factor.encryptedSecret).not.toContain(setup.secret);
    const code = service.crypto.totp(setup.secret).generate();
    await request(app)
      .post("/api/v1/auth/mfa/confirm")
      .set("Authorization", auth(initial.accessToken))
      .send({ code })
      .expect(200);
    await expect(service.authenticate(initial.accessToken)).rejects.toMatchObject({
      statusCode: 401
    });
    await request(app).post("/api/v1/auth/login").send({ email, password }).expect(401);
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password, mfaCode: code })
      .expect(401);
    // Move the fixture's recorded counter backwards rather than waiting for time.
    await database.prisma.mfaFactor.update({
      where: { userId: identity.userId },
      data: { lastUsedStep: -1 }
    });
    const elevated = await login(email, code);
    await request(app)
      .get("/api/v1/admin/access-check")
      .set("Authorization", auth(elevated.accessToken))
      .expect(200);
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password, mfaCode: code })
      .expect(401);
  });
  it("deduplicates privacy requests and disables accounts on deletion request", async () => {
    const email = await verified();
    const tokens = await login(email);
    const identity = await service.authenticate(tokens.accessToken);
    const first = await service.privacy(identity, "EXPORT");
    const duplicate = await service.privacy(identity, "EXPORT");
    expect(duplicate.id).toBe(first.id);
    await request(app)
      .post("/api/v1/me/privacy-requests")
      .set("Authorization", auth(tokens.accessToken))
      .send({ kind: "DELETE" })
      .expect(202);
    await expect(service.authenticate(tokens.accessToken)).rejects.toMatchObject({
      statusCode: 401
    });
    expect((await repo.findByEmail(email))?.status).toBe("DISABLED");
  });
  it("conceals delivery outages, rolls back challenges and exposes no secrets", async () => {
    const email = await register();
    const unavailable = new IdentityService(repo, testEnv, {
      send: () => Promise.reject(new Error("provider secret"))
    });
    expect(await unavailable.requestChallenge(email, "EMAIL_VERIFICATION")).toEqual(
      await unavailable.requestChallenge("absent@example.com", "EMAIL_VERIFICATION")
    );
    const user = await repo.findByEmail(email);
    expect(await database.prisma.challenge.count({ where: { userId: user!.id } })).toBe(0);
    const tokens = await login(await verified());
    const me = await request(app)
      .get("/api/v1/me")
      .set("Authorization", auth(tokens.accessToken))
      .expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|tokenHash|encryptedSecret/);
    expect(me.headers["cache-control"]).toBe("no-store");
  });
  it("rejects expired refresh tokens", async () => {
    const email = await verified();
    const tokens = await login(email);
    await database.prisma.session.update({
      where: { tokenHash: digest(tokens.refreshToken) },
      data: { expiresAt: new Date(0) }
    });
    await expect(service.refresh(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await expect(service.consumeChallenge(newToken(), "EMAIL_VERIFICATION")).rejects.toMatchObject({
      statusCode: 401
    });
  });
  it("allows recovery from a timed lock while preserving administrative locks", async () => {
    const email = await verified();
    await database.prisma.user.update({
      where: { email },
      data: { status: "LOCKED", lockedUntil: new Date(Date.now() + 900000), failedLogins: 5 }
    });
    await service.requestChallenge(email, "PASSWORD_RESET");
    await service.consumeChallenge(lastMessage().token, "PASSWORD_RESET", password);
    const user = await repo.findByEmail(email);
    expect(user?.status).toBe("ACTIVE");
    expect(user?.failedLogins).toBe(0);
    expect(user?.lockedUntil).toBeNull();
    await database.prisma.user.update({
      where: { email },
      data: { status: "LOCKED", lockedUntil: null }
    });
    const count = messages.length;
    await service.requestChallenge(email, "PASSWORD_RESET");
    expect(messages).toHaveLength(count);
  });
});
