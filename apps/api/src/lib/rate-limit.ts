import rateLimit from "express-rate-limit";

export function createRateLimiter(opts: { windowMs: number; max: number; message?: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: opts.message ? { error: opts.message } : undefined,
  });
}

export const authLimiter = () => createRateLimiter({ windowMs: 60_000, max: 10, message: "Слишком много запросов, подождите 1 минуту" });
export const swipeLimiter = () => createRateLimiter({ windowMs: 60_000, max: 100 });
export const generalLimiter = () => createRateLimiter({ windowMs: 60_000, max: 300 });
export const strictLimiter = () => createRateLimiter({ windowMs: 60_000, max: 20, message: "Too many requests" });
