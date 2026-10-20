import type { RequestHandler, Request } from "express";
import { AppError } from "../../common/errors/app-error.js";
import type { IdentityService, Principal } from "./identity.service.js";

declare module "express-serve-static-core" {
  interface Request {
    identity?: Principal;
  }
}
export const principal = (req: Request): Principal => {
  if (!req.identity) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  return req.identity;
};
export const authenticate =
  (service: IdentityService): RequestHandler =>
  async (req, _res, next) => {
    try {
      const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization ?? "");
      if (!match?.[1]) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      req.identity = await service.authenticate(match[1]);
      next();
    } catch (error) {
      next(error);
    }
  };
export const authorize =
  (...roles: Principal["role"][]): RequestHandler =>
  (req, _res, next) => {
    try {
      const identity = principal(req);
      if (!roles.includes(identity.role)) throw new AppError("Forbidden", 403, "FORBIDDEN");
      if (identity.role === "ADMIN" && !identity.mfaVerified)
        throw new AppError("MFA required", 403, "MFA_REQUIRED");
      next();
    } catch (error) {
      next(error);
    }
  };
