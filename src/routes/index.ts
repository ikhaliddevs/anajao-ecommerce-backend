import { Router } from "express";
import type { DatabaseClient } from "../database/client.js";
import { createHealthRouter } from "../modules/health/health.routes.js";

export const createApiRouter = (database: DatabaseClient): Router => {
  const router = Router();

  router.use(createHealthRouter(database));

  return router;
};
