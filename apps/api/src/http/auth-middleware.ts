import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "./errors.js";

export type AuthedRequest = Request & { userId: string };

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new HttpError(401, "Missing access token"));
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_ACCESS_SECRET);
    (req as AuthedRequest).userId = String(payload.sub);
    next();
  } catch {
    next(new HttpError(401, "Access token expired"));
  }
}
