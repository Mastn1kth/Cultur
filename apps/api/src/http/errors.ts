import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, message, "BAD_REQUEST", details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(409, message, "CONFLICT", details);
    this.name = "ConflictError";
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = "Too many requests") {
    super(429, message, "TOO_MANY_REQUESTS");
    this.name = "TooManyRequestsError";
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal server error") {
    super(500, message, "INTERNAL_SERVER_ERROR");
    this.name = "InternalServerError";
  }
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.id;

  // Zod validation errors
  if (error instanceof ZodError) {
    req.log?.warn({ err: error, requestId }, "Validation error");
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: error.flatten(),
      requestId,
    });
  }

  // Custom HTTP errors
  if (error instanceof HttpError) {
    const logLevel = error.status >= 500 ? "error" : "warn";
    req.log?.[logLevel]({ err: error, requestId, status: error.status }, error.message);
    
    const response: Record<string, unknown> = {
      error: error.message,
      code: error.code,
      requestId,
    };

    if (error.details) {
      response.details = error.details;
    }

    return res.status(error.status).json(response);
  }

  // Unknown errors
  const err = error as Error;
  req.log?.error({ err, requestId }, "Unhandled error");
  logger.error({ err, requestId, stack: err.stack }, "Unhandled error in request");

  return res.status(500).json({
    error: "Server is unavailable. Please try later",
    code: "INTERNAL_SERVER_ERROR",
    requestId,
  });
}
