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
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100)
});

export type AppEnv = {
  nodeEnv: z.infer<typeof nodeEnvSchema>;
  port: number;
  logLevel: string;
  databaseUrl?: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
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

  if (env.NODE_ENV !== "test" && !env.DATABASE_URL) {
    throw new EnvValidationError(["DATABASE_URL: Required outside test environment"]);
  }

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX
  };
};

export const config = loadEnv();
