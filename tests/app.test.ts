import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AppError } from "../src/common/errors/app-error.js";
import { validateRequest } from "../src/common/utils/validate.js";
import { EnvValidationError, loadEnv } from "../src/config/env.js";
import { createMockDatabase, silentLogger, testEnv } from "./helpers.js";
import { z } from "zod";

type HealthResponse = {
  success: boolean;
  data: {
    status: string;
  };
};

type ReadinessResponse = {
  data: {
    ready: boolean;
    services: {
      database: string;
    };
  };
};

type ErrorResponse = {
  success: boolean;
  error: {
    code: string;
    message?: string;
  };
};

describe("application foundation", () => {
  it("creates the application without starting the HTTP listener", () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(),
      logger: silentLogger
    });

    expect(app).toBeDefined();
  });

  it("returns application health", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(),
      logger: silentLogger
    });

    const response = await request(app).get("/api/v1/health").expect(200);
    const body = response.body as HealthResponse;

    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
  });

  it("returns readiness success when the database is reachable", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(true),
      logger: silentLogger
    });

    const response = await request(app).get("/api/v1/ready").expect(200);
    const body = response.body as ReadinessResponse;

    expect(body.data.ready).toBe(true);
    expect(body.data.services.database).toBe("ready");
  });

  it("returns readiness failure when the database is unavailable", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(false),
      logger: silentLogger
    });

    const response = await request(app).get("/api/v1/ready").expect(503);
    const body = response.body as ReadinessResponse;

    expect(body.data.ready).toBe(false);
    expect(body.data.services.database).toBe("unavailable");
  });

  it("returns a consistent unknown route response", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(),
      logger: silentLogger
    });

    const response = await request(app).get("/missing").expect(404);
    const body = response.body as ErrorResponse;

    expect(body).toMatchObject({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND"
      }
    });
  });

  it("uses the centralized error handler for application errors", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(),
      logger: silentLogger,
      configureRoutes: (app) => {
        app.get("/test-error", () => {
          throw new AppError("Example failure", 418, "EXAMPLE_FAILURE");
        });
      }
    });

    const response = await request(app).get("/test-error").expect(418);
    const body = response.body as ErrorResponse;

    expect(body).toMatchObject({
      success: false,
      error: {
        code: "EXAMPLE_FAILURE",
        message: "Example failure"
      }
    });
  });

  it("returns validation errors from request validation middleware", async () => {
    const { app } = createApp({
      env: testEnv,
      database: createMockDatabase(),
      logger: silentLogger,
      configureRoutes: (app) => {
        app.post(
          "/test-validation",
          validateRequest({ body: z.object({ name: z.string().min(2) }) }),
          (_req, res) => res.status(204).send()
        );
      }
    });

    const response = await request(app).post("/test-validation").send({ name: "" }).expect(400);
    const body = response.body as ErrorResponse;

    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("reports invalid environment configuration", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        PORT: "not-a-number",
        DATABASE_URL: "not-a-url"
      })
    ).toThrow(EnvValidationError);
  });
});
