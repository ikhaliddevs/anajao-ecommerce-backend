import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

type RequestValidationSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export const validateRequest =
  (schemas: RequestValidationSchemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query) as Request["query"];
    }

    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as Request["params"];
    }

    next();
  };
