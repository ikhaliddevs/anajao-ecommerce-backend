import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import * as OTPAuth from "otpauth";
import type { AppEnv } from "../../config/env.js";

export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
export const newToken = () => randomBytes(32).toString("base64url");
export const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export class IdentityCrypto {
  constructor(private readonly env: AppEnv) {}
  sign(userId: string, sessionId: string) {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(userId)
      .setIssuer("anajao")
      .setAudience("anajao-api")
      .setIssuedAt()
      .setExpirationTime(`${this.env.accessTtlSeconds}s`)
      .sign(Buffer.from(this.env.authSecret));
  }
  async verify(token: string) {
    const { payload } = await jwtVerify(token, Buffer.from(this.env.authSecret), {
      algorithms: ["HS256"],
      issuer: "anajao",
      audience: "anajao-api",
      typ: "JWT",
      requiredClaims: ["sub", "sid", "iat", "exp"],
      maxTokenAge: `${this.env.accessTtlSeconds}s`
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string")
      throw new Error("Invalid token claims");
    return { userId: payload.sub, sessionId: payload.sid };
  }
  encrypt(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(this.env.mfaEncryptionKey, "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  }
  decrypt(value: string) {
    const bytes = Buffer.from(value, "base64");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(this.env.mfaEncryptionKey, "hex"),
      bytes.subarray(0, 12)
    );
    cipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8");
  }
  totp(secret: string) {
    return new OTPAuth.TOTP({
      issuer: "Anajao",
      label: "Administrator",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    });
  }
  newMfa() {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    return { secret, uri: this.totp(secret).toString() };
  }
  mfaStep(secret: string, code: string) {
    const timestamp = Date.now();
    const delta = this.totp(secret).validate({ token: code, timestamp, window: 1 });
    return delta === null ? null : Math.floor(timestamp / 30000) + delta;
  }
}
