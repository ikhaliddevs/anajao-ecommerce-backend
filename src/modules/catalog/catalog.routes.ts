import { Router } from "express";
import type { IdentityService } from "../identity/identity.service.js";
import { authenticate, authorize } from "../identity/identity.middleware.js";
import type { CatalogService } from "./catalog.service.js";
import { createCatalogController } from "./catalog.controller.js";
import { catalogOperations } from "./catalog.operations.js";
export const createCatalogRouter = (service: CatalogService, identity: IdentityService) => {
  const router = Router();
  const controller = createCatalogController(service);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  for (const operation of catalogOperations) {
    const guards =
      operation.access === "public"
        ? []
        : operation.access === "admin"
          ? [authenticate(identity), authorize("ADMIN")]
          : [authenticate(identity)];
    router[operation.method](
      operation.path,
      ...guards,
      (_req, res, next) => {
        res.locals.catalogOperation = operation.key;
        next();
      },
      controller[operation.key]
    );
  }
  return router;
};
