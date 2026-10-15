import type { RequestHandler } from "express";
import { ok } from "../../common/utils/http-response.js";
import type { HealthService } from "./health.service.js";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  health: RequestHandler = (_req, res) => {
    res.status(200).json(ok(this.healthService.getHealth()));
  };

  ready: RequestHandler = async (_req, res) => {
    const readiness = await this.healthService.getReadiness();
    res.status(readiness.ready ? 200 : 503).json(ok(readiness));
  };
}
