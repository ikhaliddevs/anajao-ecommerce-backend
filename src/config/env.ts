import "dotenv/config";
import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const rawEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_SECRET: z.string().min(64).optional(),
  MFA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
  AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
  AUTH_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).max(2592000).default(604800),
  AUTH_LOGIN_LIMIT: z.coerce.number().int().positive().max(100).default(10),
  EMAIL_PROVIDER: z.enum(["disabled", "gmail"]).default("disabled"),
  GMAIL_USER: z.string().trim().email().optional(),
  GMAIL_APP_PASSWORD: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^[a-zA-Z]{16}$/))
    .optional()
});

export type AppEnv = {
  nodeEnv: z.infer<typeof nodeEnvSchema>;
  port: number;
  logLevel: string;
  databaseUrl?: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authSecret: string;
  mfaEncryptionKey: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  loginLimit: number;
  gmail?: { user: string; appPassword: string };
};

export class EnvValidationError extends Error {
  constructor(public readonly details: string[]) {
    super("Invalid environment configuration");
    this.name = "EnvValidationError";
  }
}

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => {
  const parsed = rawEnvSchema.safeParse(source);

  if (!parsed.success) {
    throw new EnvValidationError(
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    );
  }

  const env = parsed.data;
  if (env.EMAIL_PROVIDER === "gmail" && (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD)) {
    throw new EnvValidationError([
      "GMAIL_USER and GMAIL_APP_PASSWORD are required for Gmail delivery"
    ]);
  }

  if (env.NODE_ENV !== "test" && !env.DATABASE_URL) {
    throw new EnvValidationError(["DATABASE_URL: Required outside test environment"]);
  }

  if (env.NODE_ENV !== "test" && (!env.AUTH_SECRET || !env.MFA_ENCRYPTION_KEY)) {
    throw new EnvValidationError(["AUTH_SECRET and MFA_ENCRYPTION_KEY are required outside tests"]);
  }
  const origins = env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    origins.length === 0 ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return !["http:", "https:"].includes(url.protocol) || url.origin !== origin;
      } catch {
        return true;
      }
    })
  )
    throw new EnvValidationError(["CORS_ORIGINS must contain explicit HTTP(S) origins"]);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: origins,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
    authSecret: env.AUTH_SECRET ?? "test-only-secret-".repeat(5),
    mfaEncryptionKey: env.MFA_ENCRYPTION_KEY ?? "ab".repeat(32),
    accessTtlSeconds: env.AUTH_ACCESS_TTL_SECONDS,
    refreshTtlSeconds: env.AUTH_REFRESH_TTL_SECONDS,
    loginLimit: env.AUTH_LOGIN_LIMIT,
    gmail:
      env.EMAIL_PROVIDER === "gmail"
        ? { user: env.GMAIL_USER!, appPassword: env.GMAIL_APP_PASSWORD! }
        : undefined
  };
};

export const config = loadEnv();
