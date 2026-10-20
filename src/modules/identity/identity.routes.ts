import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { AppEnv } from "../../config/env.js";
import { AppError } from "../../common/errors/app-error.js";
import { createIdentityController } from "./identity.controller.js";
import { authenticate, authorize } from "./identity.middleware.js";
import type { IdentityService } from "./identity.service.js";

export const createIdentityRouter = (service: IdentityService, env: AppEnv) => {
  const router = Router();
  const controller = createIdentityController(service);
  const authenticated = authenticate(service);
  const limited = rateLimit({
    windowMs: 900000,
    limit: env.loginLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many attempts; try again later" }
      });
    }
  });
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.post("/auth/register", limited, controller.register);
  router.post("/auth/login", limited, controller.login);
  router.post("/auth/refresh", limited, controller.refresh);
  router.post("/auth/logout", controller.logout);
  router.post("/auth/logout-all", authenticated, controller.logoutAll);
  router.get("/auth/me", authenticated, controller.me);
  router.post("/auth/password/forgot", limited, controller.forgot);
  router.post("/auth/password/reset", limited, controller.reset);
  router.post("/auth/email/verify", limited, controller.verify);
  router.post("/auth/email/resend-verification", limited, controller.resend);
  router.post("/auth/phone/request-verification", limited, authenticated, controller.phoneRequest);
  router.post("/auth/phone/verify", limited, controller.phoneVerify);
  router.post("/auth/mfa/setup", limited, authenticated, controller.setupMfa);
  router.post("/auth/mfa/confirm", limited, authenticated, controller.confirmMfa);
  router.post("/auth/social/:provider", limited, () => {
    throw new AppError(
      "Social login requires a verified provider integration",
      503,
      "PROVIDER_UNAVAILABLE"
    );
  });
  router.get("/me", authenticated, controller.me);
  router.patch("/me", authenticated, controller.profile);
  router.get("/me/addresses", authenticated, controller.addresses);
  router.post("/me/addresses", authenticated, controller.addAddress);
  router.delete("/me/addresses/:id", authenticated, controller.deleteAddress);
  router.post("/me/privacy-requests", authenticated, controller.privacy);
  router.get("/admin/access-check", authenticated, authorize("ADMIN"), controller.admin);
  return router;
};
