import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttpModule from "pino-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger, generateRequestId } from "./lib/logger.js";
import { checkRedisConnection } from "./lib/redis.js";
import { checkDbConnection } from "./db/pool.js";
import { generalLimiter, authLimiter, swipeLimiter } from "./lib/rate-limit.js";
import { metricsMiddleware, metricsHandler } from "./lib/metrics.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { discoveryRouter } from "./modules/discovery/discovery.routes.js";
import { matchingRouter } from "./modules/matching/matching.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { communitiesRouter } from "./modules/communities/communities.routes.js";
import { moderationRouter } from "./modules/moderation/moderation.routes.js";
import { mediaRouter } from "./modules/media/media.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { privacyRouter } from "./modules/privacy/privacy.routes.js";
import { devRouter } from "./modules/dev/dev.routes.js";
import { errorHandler } from "./http/errors.js";

const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const openApiPath = path.resolve(dirname, "../openapi.yaml");

export function createApp() {
  const app = express();

  // HTTP request logging
  app.use(
    pinoHttp({
      logger,
      genReqId: generateRequestId,
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },
    })
  );

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // Prometheus metrics
  app.use(metricsMiddleware);
  app.get("/metrics", metricsHandler());

  app.get("/health", async (req, res) => {
    const dbOk = await checkDbConnection();
    const redisOk = await checkRedisConnection();
    const allOk = dbOk && redisOk;
    const status = allOk ? "ok" : "degraded";

    req.log.info({ db: dbOk, redis: redisOk }, `Health check: ${status}`);

    res.status(allOk ? 200 : 503).json({
      status,
      db: dbOk,
      redis: redisOk,
      ts: Date.now()
    });
  });
  if (fs.existsSync(openApiPath)) {
    const spec = YAML.parse(fs.readFileSync(openApiPath, "utf8"));
    app.get("/docs/openapi.json", (_req, res) => res.json(spec));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use(generalLimiter());
  app.use("/auth", authLimiter(), authRouter);
  app.use("/users", usersRouter);
  app.use("/discovery", discoveryRouter);
  app.use("/matching/swipes", swipeLimiter());
  app.use("/matching", matchingRouter);
  app.use("/chat", chatRouter);
  app.use("/events", eventsRouter);
  app.use("/communities", communitiesRouter);
  app.use("/moderation", moderationRouter);
  app.use("/media", mediaRouter);
  app.use("/search", searchRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/privacy", privacyRouter);
  app.use("/dev", devRouter);
  app.use(errorHandler);
  return app;
}
