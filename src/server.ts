import { createServer } from "node:http";
import { createApp } from "./app.js";

const bootstrap = async () => {
  const { app, database, logger, env } = createApp();

  await database.connect();
  logger.info("Database connected successfully");

  const server = createServer(app);

  server.listen(env.port, () => {
    logger.info(`Anajao backend listening on port ${env.port}`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Graceful shutdown requested");
    server.close((error) => {
      void (async () => {
        if (error) {
          logger.error({}, "HTTP server failed to close cleanly");
          process.exitCode = 1;
        }

        await database.disconnect();
        process.exit();
      })();
    });
  };

  process.on("SIGTERM", (signal) => {
    shutdown(signal);
  });
  process.on("SIGINT", (signal) => {
    shutdown(signal);
  });
};

bootstrap().catch(() => {
  // Driver startup exceptions can contain connection details or credentials.
  console.error("Failed to start Anajao backend; check environment and database availability");
  process.exit(1);
});
