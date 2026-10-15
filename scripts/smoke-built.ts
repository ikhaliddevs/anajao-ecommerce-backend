import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test"))
  throw new Error("Supply an isolated TEST_DATABASE_URL ending in _test");
const reservation = createServer();
await new Promise<void>((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const address = reservation.address();
if (!address || typeof address === "string") throw new Error("Port allocation failed");
const port = address.port;
await new Promise<void>((resolve, reject) =>
  reservation.close((error) => (error ? reject(error) : resolve()))
);
const child = spawn(process.execPath, ["dist/src/server.js"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    LOG_LEVEL: "silent",
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: randomBytes(48).toString("hex"),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString("hex")
  },
  stdio: "ignore",
  windowsHide: true
});
let exitCode: number | null = null;
child.on("exit", (code) => {
  exitCode = code;
});
try {
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (exitCode !== null) throw new Error(`Built server exited with ${String(exitCode)}`);
    try {
      const response = await fetch(`${base}/api/v1/ready`, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* startup not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Built server did not become ready");
  for (const [path, status] of [
    ["/api/v1/health", 200],
    ["/api/v1/ready", 200],
    ["/api-docs/", 200],
    ["/api-docs.json", 200],
    ["/api/v1/me", 401]
  ] as const) {
    const response = await fetch(`${base}${path}`);
    if (response.status !== status)
      throw new Error(`${path}: expected ${status}, received ${response.status}`);
    console.log(`${path}: ${response.status}`);
  }
} finally {
  child.kill("SIGTERM");
  if (child.exitCode === null)
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
}
