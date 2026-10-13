import pino from "pino";
import type { AppEnv } from "./config/env.js";

export const createLogger = (env: AppEnv) =>
  pino({
    level: env.logLevel,
    base: env.nodeEnv === "production" ? undefined : null,
    redact: {
      paths: ["req.headers.authorization", "DATABASE_URL", "databaseUrl"],
      censor: "[redacted]"
    }
  });
