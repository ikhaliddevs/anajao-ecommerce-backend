import pino from "pino";
import type { AppEnv } from "./config/env.js";

export const createLogger = (env: AppEnv) =>
  pino({
    level: env.logLevel,
    base: env.nodeEnv === "production" ? undefined : null,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "req.body",
        "res.body",
        "password",
        "passwordHash",
        "token",
        "refreshToken",
        "secret",
        "AUTH_SECRET",
        "MFA_ENCRYPTION_KEY",
        "DATABASE_URL",
        "databaseUrl"
      ],
      censor: "[redacted]"
    }
  });
