import client from "prom-client";
import type { Request, Response, NextFunction } from "express";

const register = new client.Registry();

let metricsInitialized = false;

export function initMetrics() {
  if (metricsInitialized) return;
  metricsInitialized = true;
  client.collectDefaultMetrics({ register });
}

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const activeUsers = new client.Gauge({
  name: "active_users",
  help: "Number of active users in the last 5 minutes",
  registers: [register],
});

// Track database query duration
export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
  });
  next();
}

export function metricsHandler() {
  return async (_req: Request, res: Response) => {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  };
}

export { register, activeUsers, httpRequestsTotal, httpRequestDuration };
