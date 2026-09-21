import http from "node:http";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { connectRedis, disconnectRedis } from "./lib/redis.js";
import { startEventReminderJob } from "./lib/jobs/index.js";
import { initMetrics } from "./lib/metrics.js";
import { createApp } from "./app.js";
import { attachRealtime } from "./realtime.js";
import { pool } from "./db/pool.js";

async function startServer() {
  // Подключаем Redis (не критично, если не подключится)
  await connectRedis();
  initMetrics();

  const app = createApp();
  const server = http.createServer(app);
  const io = attachRealtime(server);

  // Start background jobs
  const eventReminderJob = startEventReminderJob();
  logger.info('Background jobs started');

  server.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        nodeVersion: process.version,
      },
      "CultureMatch API started"
    );
  });

  const shutdown = async () => {
    logger.info("Shutting down gracefully");
    
    // Stop cron jobs
    eventReminderJob.stop();
    logger.info("Background jobs stopped");
    
    io.close();
    server.close(async () => {
      logger.info("HTTP server closed");
      await disconnectRedis();
      await pool.end();
      logger.info("Database pool closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error({ reason, promise }, "Unhandled promise rejection");
  });
}

startServer().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
