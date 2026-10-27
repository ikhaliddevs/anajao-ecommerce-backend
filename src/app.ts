import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Logger as PinoLogger } from "pino";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import type { AppEnv } from "./config/env.js";
import { config } from "./config/env.js";
import { openApiDocument } from "./config/openapi.js";
import { createErrorHandler } from "./common/middleware/error-handler.js";
import { notFoundHandler } from "./common/middleware/not-found.js";
import type { Logger } from "./common/types/logger.js";
import { PrismaDatabaseClient, type DatabaseClient } from "./database/client.js";
import { createLogger } from "./logger.js";
import { createApiRouter } from "./routes/index.js";
import { IdentityRepository } from "./modules/identity/identity.repository.js";
import { IdentityService } from "./modules/identity/identity.service.js";
import { createIdentityRouter } from "./modules/identity/identity.routes.js";
import type { ChallengeDelivery } from "./modules/identity/identity.providers.js";
import { createEmailDelivery } from "./modules/identity/gmail-delivery.js";
import { CatalogRepository } from "./modules/catalog/catalog.repository.js";
import { CatalogService } from "./modules/catalog/catalog.service.js";
import { createCatalogRouter } from "./modules/catalog/catalog.routes.js";

export type AppDependencies = {
  env?: AppEnv;
  logger?: Logger;
  database?: DatabaseClient;
  identity?: IdentityService;
  catalog?: CatalogService;
  challengeDelivery?: ChallengeDelivery;
  configureRoutes?: (app: Express) => void;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const env = dependencies.env ?? config;
  const logger = dependencies.logger ?? createLogger(env);
  const database = dependencies.database ?? new PrismaDatabaseClient(logger, env.databaseUrl);
  const identity =
    dependencies.identity ??
    (database instanceof PrismaDatabaseClient
      ? new IdentityService(
          new IdentityRepository(database.prisma),
          env,
          dependencies.challengeDelivery ?? createEmailDelivery(env)
        )
      : undefined);
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false
    })
  );
  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      limit: env.rateLimitMax,
      standardHeaders: "draft-8",
      legacyHeaders: false
    })
  );
  app.use(express.json({ limit: "1mb" }));

  if (env.nodeEnv !== "test" && isPinoLogger(logger)) {
    app.use(
      pinoHttp({
        logger,
        serializers: {
          req: (req: { method?: string; id?: string }) => ({ method: req.method, id: req.id })
        }
      })
    );
  }

  app.get("/api-docs.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use("/api/v1", createApiRouter(database));
  if (identity) app.use("/api/v1", createIdentityRouter(identity, env));
  const catalog =
    dependencies.catalog ??
    (database instanceof PrismaDatabaseClient
      ? new CatalogService(new CatalogRepository(database.prisma))
      : undefined);
  if (catalog && identity) app.use("/api/v1", createCatalogRouter(catalog, identity));
  dependencies.configureRoutes?.(app);
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return { app, database, logger, env };
};

const isPinoLogger = (logger: Logger): logger is PinoLogger => {
  return typeof (logger as Partial<PinoLogger>).child === "function";
};
