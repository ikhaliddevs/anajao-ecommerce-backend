import type { AppEnv } from "../src/config/env.js";
import type { DatabaseClient } from "../src/database/client.js";
import { vi } from "vitest";

export const testEnv: AppEnv = {
  nodeEnv: "test",
  port: 3000,
  logLevel: "silent",
  corsOrigins: ["http://localhost:3000"],
  rateLimitWindowMs: 60000,
  rateLimitMax: 1000
};

export const createMockDatabase = (ready = true): DatabaseClient => ({
  connect: vi.fn(() => Promise.resolve()),
  disconnect: vi.fn(() => Promise.resolve()),
  isReady: vi.fn(() => Promise.resolve(ready))
});

export const silentLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};
