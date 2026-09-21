import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export async function createRefreshTokenRecord(userId: string, deviceId: string, now = new Date()): Promise<RefreshTokenRecord> {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    userId,
    deviceId,
    token,
    tokenHash: hashToken(token),
    expiresAt,
    revokedAt: null
  };
}

export async function rotateRefreshToken(record: RefreshTokenRecord, deviceId: string, now = new Date()) {
  if (record.deviceId !== deviceId) throw new Error("Refresh token device mismatch");
  if (record.revokedAt) throw new Error("Refresh token already revoked");
  if (record.expiresAt <= now) throw new Error("Refresh token expired");
  const next = await createRefreshTokenRecord(record.userId, deviceId, now);
  return {
    previous: { ...record, revokedAt: now },
    next
  };
}
