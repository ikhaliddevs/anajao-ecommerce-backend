import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/app-error.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(req.originalUrl));
};
