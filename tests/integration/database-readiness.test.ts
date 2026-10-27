import "dotenv/config";
import { describe, expect, it } from "vitest";
import type { Logger } from "../../src/common/types/logger.js";
import { PrismaDatabaseClient } from "../../src/database/client.js";

const logger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined
};

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl && !new URL(testUrl).pathname.endsWith("_test"))
  throw new Error("Integration database name must end in _test");
describe.skipIf(!testUrl)("database readiness integration", () => {
  it("connects to the configured database and runs a readiness query", async () => {
    const database = new PrismaDatabaseClient(logger, testUrl);

    await database.connect();
    await expect(database.isReady()).resolves.toBe(true);
    await database.disconnect();
  });
});
