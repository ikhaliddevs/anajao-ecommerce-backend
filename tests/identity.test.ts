import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  IdentityCrypto,
  digest,
  hashPassword,
  newToken,
  verifyPassword
} from "../src/modules/identity/identity.crypto.js";
import {
  emailSchema,
  passwordSchema,
  registerSchema
} from "../src/modules/identity/identity.validation.js";
import { loadEnv } from "../src/config/env.js";
import { IdentityService } from "../src/modules/identity/identity.service.js";
import type { IdentityRepositoryPort } from "../src/modules/identity/identity.repository.js";
import { unavailableDelivery } from "../src/modules/identity/identity.providers.js";
import { createApp } from "../src/app.js";
import { createMockDatabase, silentLogger, testEnv } from "./helpers.js";

describe("identity security primitives", () => {
  const crypto = new IdentityCrypto(testEnv);
  it("salts Argon2id passwords and rejects incorrect passwords", async () => {
    const password = "A safe unique test passphrase";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).toContain("$argon2id$");
    expect(first).not.toBe(second);
    expect(await verifyPassword(first, password)).toBe(true);
    expect(await verifyPassword(first, "incorrect")).toBe(false);
  });
  it("generates high entropy opaque secrets and deterministic digests", () => {
    const token = newToken();
    expect(token).toHaveLength(43);
    expect(newToken()).not.toBe(token);
    expect(digest(token)).toHaveLength(64);
    expect(digest(token)).not.toContain(token);
  });
  it("validates JWT signatures and claims", async () => {
    const token = await crypto.sign("user", "session");
    expect(await crypto.verify(token)).toEqual({ userId: "user", sessionId: "session" });
    const other = new IdentityCrypto({ ...testEnv, authSecret: "different".repeat(12) });
    await expect(other.verify(token)).rejects.toThrow();
    await expect(crypto.verify("invalid")).rejects.toThrow();
  });
  it("rejects expired access tokens", async () => {
    vi.useFakeTimers();
    try {
      const token = await crypto.sign("user", "session");
      vi.advanceTimersByTime(601000);
      await expect(crypto.verify(token)).rejects.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
  it("encrypts and authenticates MFA secrets", () => {
    const secret = crypto.newMfa();
    const encrypted = crypto.encrypt(secret.secret);
    expect(encrypted).not.toContain(secret.secret);
    expect(crypto.decrypt(encrypted)).toBe(secret.secret);
    const tampered = Buffer.from(encrypted, "base64");
    tampered[15] = tampered[15]! ^ 1;
    expect(() => crypto.decrypt(tampered.toString("base64"))).toThrow();
    expect(crypto.mfaStep(secret.secret, crypto.totp(secret.secret).generate())).toBeTypeOf(
      "number"
    );
  });
  it("normalizes email and rejects privilege injection and weak passwords", () => {
    expect(emailSchema.parse("  PERSON@EXAMPLE.COM ")).toBe("person@example.com");
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(20)).success).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Test",
        email: "test@example.com",
        password: "Long safe test phrase",
        role: "ADMIN"
      }).success
    ).toBe(false);
  });
  it("requires strong secrets outside tests and explicit CORS origins", () => {
    expect(() =>
      loadEnv({ NODE_ENV: "production", DATABASE_URL: "mysql://test@localhost/db" })
    ).toThrow();
    expect(() => loadEnv({ NODE_ENV: "test", AUTH_SECRET: "weak" })).toThrow();
    expect(() => loadEnv({ NODE_ENV: "test", MFA_ENCRYPTION_KEY: "bad" })).toThrow();
    expect(() => loadEnv({ NODE_ENV: "test", CORS_ORIGINS: "*" })).toThrow();
    expect(loadEnv({ NODE_ENV: "test" }).accessTtlSeconds).toBe(600);
  });
});

describe("identity HTTP boundary with mocked repository", () => {
  const build = (limit = 100) => {
    const repo: IdentityRepositoryPort = {
      findByEmail: vi.fn(() => Promise.resolve(null)),
      findSession: vi.fn(() => Promise.resolve(null)),
      findChallenge: vi.fn(() => Promise.resolve(null)),
      createUser: vi.fn(),
      locked: vi.fn()
    };
    const service = new IdentityService(repo, testEnv, unavailableDelivery);
    return {
      repo,
      app: createApp({
        env: { ...testEnv, loginLimit: limit },
        database: createMockDatabase(),
        logger: silentLogger,
        identity: service
      }).app
    };
  };
  it("rejects invalid requests, missing auth and unavailable social providers", async () => {
    const { app } = build();
    await request(app).post("/api/v1/auth/register").send({}).expect(400);
    await request(app).get("/api/v1/me").expect(401);
    await request(app).get("/api/v1/admin/access-check").expect(401);
    await request(app).post("/api/v1/auth/social/google").send({}).expect(503);
    await request(app).post("/api/v1/auth/refresh").send({ refreshToken: newToken() }).expect(401);
  });
  it("rate limits auth attempts with a consistent error envelope", async () => {
    const { app } = build(1);
    await request(app).post("/api/v1/auth/login").send({}).expect(400);
    const result = await request(app).post("/api/v1/auth/login").send({}).expect(429);
    expect(result.body).toMatchObject({ success: false, error: { code: "RATE_LIMITED" } });
  });
  it("maps malformed JSON and oversized bodies to safe client errors", async () => {
    const { app } = build();
    await request(app)
      .post("/api/v1/auth/register")
      .set("Content-Type", "application/json")
      .send('{"password":')
      .expect(400);
    await request(app)
      .post("/api/v1/auth/register")
      .send({ password: "x".repeat(1100000) })
      .expect(413);
  });
  it("returns generic responses for unknown recovery addresses and logout", async () => {
    const { app } = build();
    await request(app)
      .post("/api/v1/auth/password/forgot")
      .send({ email: "unknown@example.com" })
      .expect(202);
    await request(app).post("/api/v1/auth/logout").send({ refreshToken: newToken() }).expect(200);
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "unknown@example.com", password: "wrong" })
      .expect(401);
  });
  it("sanitizes infrastructure failures in responses and logs", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(),
      logger: silentLogger,
      configureRoutes: (server) => {
        server.get("/private-driver-error", () => {
          throw new Error("password=secret-value token=private-token mysql://credential");
        });
      }
    });
    const response = await request(app).get("/private-driver-error").expect(500);
    expect(JSON.stringify(response.body)).not.toContain("secret-value");
    expect(silentLogger.error).toHaveBeenLastCalledWith({}, "Unhandled application error");
  });
});
