import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import type { Logger } from "../types/logger.js";

export const createErrorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error, _req, res, next) => {
    void next;

    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      });
      return;
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error({ error: error.message }, error.message);
      }

      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Unhandled application error"
    );

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error"
      }
    });
  };
