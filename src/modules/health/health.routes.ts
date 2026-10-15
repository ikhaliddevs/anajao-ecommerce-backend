import { Router } from "express";
import type { DatabaseClient } from "../../database/client.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

export const createHealthRouter = (database: DatabaseClient): Router => {
  const router = Router();
  const service = new HealthService(database);
  const controller = new HealthController(service);

  router.get("/health", controller.health);
  router.get("/ready", controller.ready);

  return router;
};
