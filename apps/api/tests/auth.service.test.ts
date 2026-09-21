import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../src/http/errors.js";
import {
  createMagicLinkRequest,
  refreshSession,
  revokeAllRefreshTokensForSession,
  verifyAppleIdentityToken,
  verifyGoogleToken,
  verifyMagicLinkToken
} from "../src/modules/auth/auth.service.js";
import { createRefreshTokenRecord } from "../src/modules/auth/token-service.js";
import { hashToken } from "../src/modules/auth/token-service.js";

function result<T>(rows: T[]) {
  return { rows, rowCount: rows.length };
}

describe("magic link auth service", () => {
  it("hashes the token before saving and sends a login link", async () => {
    const sent: Array<{ email: string; link: string }> = [];
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return result([]);
    });

    const response = await createMagicLinkRequest("USER@example.com", {
      query,
      generateToken: () => "plain-token",
      sendMagicLinkEmail: async (email, link) => {
        sent.push({ email, link });
      }
    });

    expect(queries[0].params[0]).toBe("user@example.com");
    expect(queries[0].params[1]).toBe(hashToken("plain-token"));
    expect(queries[0].params[1]).not.toBe("plain-token");
    expect(sent).toEqual([{ email: "user@example.com", link: response.link }]);
    expect(response.link).toBe("culturematch://auth/verify?token=plain-token");
  });

  it("verifies a fresh token, marks it used, creates a user, and returns a session", async () => {
    const query = vi.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM magic_links")) {
        expect(params[0]).toBe(hashToken("fresh-token"));
        return result([{ id: "magic-1", email: "new@example.com", used_at: null, expires_at: new Date("2026-01-01T00:15:00Z") }]);
      }
      if (sql.includes("UPDATE magic_links")) return result([{ id: "magic-1" }]);
      if (sql.includes("SELECT id FROM users WHERE email")) return result([]); // User doesn't exist yet
      if (sql.includes("INSERT INTO users")) return result([{ id: "user-1" }]);
      if (sql.includes("INSERT INTO auth_providers")) return result([]);
      if (sql.includes("INSERT INTO refresh_tokens")) return result([]);
      throw new Error(`Unexpected query: ${sql}`);
    });

    const session = await verifyMagicLinkToken("fresh-token", "device-1", {
      query,
      now: () => new Date("2026-01-01T00:00:00Z")
    });

    expect(session.userId).toBe("user-1");
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).toEqual(expect.any(String));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE magic_links SET used_at=now()"), ["magic-1"]);
  });

  it("rejects a reused token with the exact product error", async () => {
    const query = vi.fn(async () => result([{ id: "magic-1", email: "used@example.com", used_at: new Date(), expires_at: new Date("2026-01-01T00:15:00Z") }]));

    await expect(verifyMagicLinkToken("used-token", "device-1", {
      query,
      now: () => new Date("2026-01-01T00:00:00Z")
    })).rejects.toMatchObject(new HttpError(400, "Link already used"));
  });

  it("rejects an expired token with the exact product error", async () => {
    const query = vi.fn(async () => result([{ id: "magic-1", email: "old@example.com", used_at: null, expires_at: new Date("2026-01-01T00:00:00Z") }]));

    await expect(verifyMagicLinkToken("expired-token", "device-1", {
      query,
      now: () => new Date("2026-01-01T00:16:00Z")
    })).rejects.toMatchObject(new HttpError(400, "Link expired. Request a new one."));
  });

  it("rejects an unknown token with the exact product error", async () => {
    const query = vi.fn(async () => result([]));

    await expect(verifyMagicLinkToken("missing-token", "device-1", { query })).rejects.toMatchObject(new HttpError(400, "Invalid link"));
  });
});

describe("refresh session service", () => {
  it("rotates a stored refresh token and writes the replacement token", async () => {
    const existing = await createRefreshTokenRecord("user-1", "device-1");
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("SELECT * FROM refresh_tokens")) {
        return result([{
          id: existing.id,
          user_id: existing.userId,
          device_id: existing.deviceId,
          token_hash: existing.tokenHash,
          expires_at: existing.expiresAt,
          revoked_at: null
        }]);
      }
      if (sql.includes("UPDATE refresh_tokens SET revoked_at")) return result([]);
      if (sql.includes("INSERT INTO refresh_tokens")) return result([]);
      throw new Error(`Unexpected query: ${sql}`);
    });

    const session = await refreshSession(existing.token, "device-1", { query });

    expect(session.userId).toBe("user-1");
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken).not.toBe(existing.token);
    expect(queries[1].params[1]).toBe(existing.id);
    expect(queries[2].params[1]).toBe("user-1");
    expect(queries[2].params[3]).toBe("device-1");
  });

  it("rejects an unknown refresh token", async () => {
    const query = vi.fn(async () => result([]));

    await expect(refreshSession("missing-refresh-token-value", "device-1", { query }))
      .rejects.toMatchObject(new HttpError(401, "Refresh token invalid"));
  });
});

describe("logout refresh token service", () => {
  it("revokes all active refresh tokens for the refresh token user", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT user_id AS id")) return result([{ id: "user-1" }]);
      if (sql.includes("UPDATE refresh_tokens SET revoked_at=now()")) return result([]);
      throw new Error(`Unexpected query: ${sql}`);
    });

    await revokeAllRefreshTokensForSession("known-refresh-token-value", { query });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE refresh_tokens SET revoked_at=now()"), ["user-1"]);
  });

  it("does not revoke anything for an unknown refresh token", async () => {
    const query = vi.fn(async () => result([]));

    await revokeAllRefreshTokensForSession("missing-refresh-token-value", { query });

    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("oauth auth service", () => {
  it("creates a Google-backed session from a verified id token payload", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT user_id AS id FROM auth_providers")) return result([]);
      if (sql.includes("INSERT INTO users")) return result([{ id: "user-google" }]);
      if (sql.includes("INSERT INTO auth_providers")) return result([]);
      if (sql.includes("INSERT INTO refresh_tokens")) return result([]);
      throw new Error(`Unexpected query: ${sql}`);
    });

    const session = await verifyGoogleToken("google-token", "device-1", {
      query,
      verifyGoogleIdToken: async () => ({ sub: "google-sub", email: "User@Example.com" })
    });

    expect(session.userId).toBe("user-google");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO auth_providers"), ["user-google", "google", "google-sub"]);
  });

  it("rejects a Google token payload without subject", async () => {
    await expect(verifyGoogleToken("google-token", "device-1", {
      query: vi.fn(),
      verifyGoogleIdToken: async () => ({ email: "user@example.com" })
    })).rejects.toMatchObject(new HttpError(400, "Invalid Google token"));
  });

  it("creates an Apple-backed session from a verified identity token payload", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT user_id AS id FROM auth_providers")) return result([]);
      if (sql.includes("INSERT INTO users")) return result([{ id: "user-apple" }]);
      if (sql.includes("INSERT INTO auth_providers")) return result([]);
      if (sql.includes("INSERT INTO refresh_tokens")) return result([]);
      throw new Error(`Unexpected query: ${sql}`);
    });

    const session = await verifyAppleIdentityToken("apple-token", "device-1", {
      query,
      verifyAppleJwt: async () => ({ sub: "apple-sub", email: "Apple@Example.com" })
    });

    expect(session.userId).toBe("user-apple");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO auth_providers"), ["user-apple", "apple", "apple-sub"]);
  });

  it("rejects an Apple token payload without subject", async () => {
    await expect(verifyAppleIdentityToken("apple-token", "device-1", {
      query: vi.fn(),
      verifyAppleJwt: async () => ({ email: "user@example.com" })
    })).rejects.toMatchObject(new HttpError(400, "Invalid Apple token"));
  });
});
