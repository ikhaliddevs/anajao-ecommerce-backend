import type { RequestHandler } from "express";
import type { z, ZodType } from "zod";
import { asyncHandler } from "../../common/utils/async-handler.js";
import type { IdentityService } from "./identity.service.js";
import { principal } from "./identity.middleware.js";
import * as schemas from "./identity.validation.js";

// Parse at the HTTP boundary; services receive validated, typed DTOs.
const action = <S extends ZodType>(
  schema: S,
  status: number,
  work: (body: z.infer<S>, req: Parameters<RequestHandler>[0]) => Promise<unknown>
) =>
  asyncHandler(async (req, res) => {
    const result = await work(schema.parse(req.body), req);
    res.status(status).json({ success: true, data: result });
  });
export const createIdentityController = (service: IdentityService) => ({
  register: action(schemas.registerSchema, 202, (body) => service.register(body)),
  login: action(schemas.loginSchema, 200, (body) =>
    service.login(body.email, body.password, body.mfaCode)
  ),
  refresh: action(schemas.refreshSchema, 200, (body) => service.refresh(body.refreshToken)),
  logout: action(schemas.refreshSchema, 200, (body) => service.logout(body.refreshToken)),
  logoutAll: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.logoutAll(principal(req)) });
  }),
  me: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.me(principal(req)) });
  }),
  forgot: action(schemas.emailRequestSchema, 202, (body) =>
    service.requestChallenge(body.email, "PASSWORD_RESET")
  ),
  resend: action(schemas.emailRequestSchema, 202, (body) =>
    service.requestChallenge(body.email, "EMAIL_VERIFICATION")
  ),
  verify: action(schemas.challengeSchema, 200, (body) =>
    service.consumeChallenge(body.token, "EMAIL_VERIFICATION")
  ),
  reset: action(schemas.resetSchema, 200, (body) =>
    service.consumeChallenge(body.token, "PASSWORD_RESET", body.password)
  ),
  phoneRequest: asyncHandler(async (req, res) => {
    const user = await service.me(principal(req));
    res.status(202).json({
      success: true,
      data: await service.requestChallenge(user.email, "PHONE_VERIFICATION")
    });
  }),
  phoneVerify: action(schemas.challengeSchema, 200, (body) =>
    service.consumeChallenge(body.token, "PHONE_VERIFICATION")
  ),
  profile: action(schemas.profileSchema, 200, (body, req) => service.profile(principal(req), body)),
  addresses: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.addresses(principal(req)) });
  }),
  addAddress: action(schemas.addressSchema, 201, (body, req) =>
    service.addAddress(principal(req), body)
  ),
  deleteAddress: asyncHandler(async (req, res) => {
    const { id } = schemas.addressParamsSchema.parse(req.params);
    res.json({ success: true, data: await service.deleteAddress(principal(req), id) });
  }),
  privacy: action(schemas.privacySchema, 202, (body, req) =>
    service.privacy(principal(req), body.kind)
  ),
  setupMfa: action(schemas.mfaSetupSchema, 200, (body, req) =>
    service.setupMfa(principal(req), body.password)
  ),
  confirmMfa: action(schemas.mfaSchema, 200, (body, req) =>
    service.confirmMfa(principal(req), body.code)
  ),
  admin: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.adminCheck(principal(req)) });
  })
});
