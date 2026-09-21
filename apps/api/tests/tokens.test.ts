import { describe, expect, it } from "vitest";
import { createRefreshTokenRecord, rotateRefreshToken } from "../src/modules/auth/token-service.js";

describe("refresh token rotation", () => {
  it("revokes the old token and returns a new device-bound token", async () => {
    const first = await createRefreshTokenRecord("user-1", "iphone-15", new Date("2026-01-01T00:00:00Z"));
    const rotated = await rotateRefreshToken(first, "iphone-15", new Date("2026-01-02T00:00:00Z"));

    expect(rotated.previous.revokedAt).toEqual(new Date("2026-01-02T00:00:00Z"));
    expect(rotated.next.userId).toBe("user-1");
    expect(rotated.next.deviceId).toBe("iphone-15");
    expect(rotated.next.tokenHash).not.toBe(first.tokenHash);
  });

  it("rejects rotation from a different device", async () => {
    const first = await createRefreshTokenRecord("user-1", "iphone-15", new Date("2026-01-01T00:00:00Z"));

    await expect(rotateRefreshToken(first, "android", new Date("2026-01-02T00:00:00Z"))).rejects.toThrow("Refresh token device mismatch");
  });

  it("rejects rotation of an already revoked token", async () => {
    const first = await createRefreshTokenRecord("user-1", "iphone-15", new Date("2026-01-01T00:00:00Z"));
    first.revokedAt = new Date("2026-01-01T00:05:00Z");

    await expect(rotateRefreshToken(first, "iphone-15", new Date("2026-01-02T00:00:00Z"))).rejects.toThrow("Refresh token already revoked");
  });

  it("rejects rotation of an expired token", async () => {
    const first = await createRefreshTokenRecord("user-1", "iphone-15", new Date("2026-01-01T00:00:00Z"));

    await expect(rotateRefreshToken(first, "iphone-15", new Date("2026-02-01T00:00:01Z"))).rejects.toThrow("Refresh token expired");
  });
});
