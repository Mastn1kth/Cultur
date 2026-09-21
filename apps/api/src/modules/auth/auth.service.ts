import crypto from "node:crypto";
import jwt, { type JwtHeader, type JwtPayload, type SigningKeyCallback } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import jwksClient from "jwks-rsa";
import { config } from "../../config.js";
import { query as defaultQuery } from "../../db/pool.js";
import { HttpError, BadRequestError, InternalServerError } from "../../http/errors.js";
import { createModuleLogger } from "../../lib/logger.js";
import { emailService } from "../../lib/email/index.js";
import { createAccessToken, createRefreshTokenRecord, hashToken, rotateRefreshToken } from "./token-service.js";

const logger = createModuleLogger("auth.service");

type DbResult<T> = { rows: T[]; rowCount: number | null };
type DbQuery = (text: string, params?: unknown[]) => Promise<DbResult<unknown>>;

type AuthServiceDeps = {
  query?: DbQuery;
  generateToken?: () => string;
  now?: () => Date;
  sendMagicLinkEmail?: (email: string, link: string) => Promise<void>;
  verifyGoogleIdToken?: (idToken: string, audience: string) => Promise<{ sub?: string; email?: string }>;
  verifyAppleJwt?: (identityToken: string) => Promise<JwtPayload>;
};

type MagicLinkRow = {
  id: string;
  email: string;
  used_at: Date | string | null;
  expires_at: Date | string;
};

type UserIdRow = { id: string };
type RefreshTokenRow = {
  id: string;
  user_id: string;
  device_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);
const appleClient = jwksClient({ jwksUri: "https://appleid.apple.com/auth/keys" });

function db(deps?: AuthServiceDeps): DbQuery {
  return (deps?.query ?? defaultQuery) as DbQuery;
}

function generateMagicToken(deps?: AuthServiceDeps) {
  return deps?.generateToken?.() ?? crypto.randomBytes(32).toString("base64url");
}

export function buildMagicLink(token: string) {
  const encoded = encodeURIComponent(token);
  const base = config.APP_DEEP_LINK.replace(/\/$/, "");
  if (base.includes("://")) {
    return `${base}?token=${encoded}`;
  }
  return `${base}://auth/verify?token=${encoded}`;
}

export async function sendMagicLinkEmail(email: string, link: string) {
  try {
    const result = await emailService.sendMagicLink({
      email,
      link,
      expiresInMinutes: 15,
      language: 'en', // TODO: detect user language from profile or browser
    });

    if (!result.success) {
      logger.error({ email, error: result.error }, 'Failed to send magic link email');
      throw new InternalServerError('Failed to send email');
    }

    logger.info({ email, messageId: result.messageId }, 'Magic link email sent successfully');
  } catch (error) {
    logger.error({ error, email }, 'Error sending magic link email');
    throw new InternalServerError('Failed to send email');
  }
}

export async function createMagicLinkRequest(email: string, deps?: AuthServiceDeps) {
  const normalizedEmail = email.toLowerCase();
  const token = generateMagicToken(deps);
  const link = buildMagicLink(token);

  logger.info({ email: normalizedEmail }, "Creating magic link request");

  await db(deps)(
    "INSERT INTO magic_links(email, token_hash, expires_at) VALUES($1, $2, now() + interval '15 minutes')",
    [normalizedEmail, hashToken(token)]
  );
  await (deps?.sendMagicLinkEmail ?? sendMagicLinkEmail)(normalizedEmail, link);

  return { link, token };
}

async function createSession(userId: string, deviceId: string, deps?: AuthServiceDeps): Promise<AuthSession> {
  const refresh = await createRefreshTokenRecord(userId, deviceId);
  await db(deps)(
    "INSERT INTO refresh_tokens(id,user_id,token_hash,device_id,expires_at) VALUES($1,$2,$3,$4,$5)",
    [refresh.id, refresh.userId, refresh.tokenHash, refresh.deviceId, refresh.expiresAt]
  );
  return {
    accessToken: createAccessToken(userId),
    refreshToken: refresh.token,
    userId
  };
}

async function findOrCreateEmailUser(email: string, deps?: AuthServiceDeps) {
  const normalizedEmail = email.toLowerCase();
  
  // Check if user already exists
  const existingUser = await db(deps)(
    "SELECT id FROM users WHERE email=$1",
    [normalizedEmail]
  ) as DbResult<UserIdRow>;
  
  const isNewUser = existingUser.rows.length === 0;
  
  const userResult = await db(deps)(
    "INSERT INTO users(email, is_verified, last_active) VALUES($1, true, now()) ON CONFLICT(email) DO UPDATE SET last_active=now() RETURNING id",
    [normalizedEmail]
  ) as DbResult<UserIdRow>;
  const userId = userResult.rows[0]?.id;
  if (!userId) throw new Error("Failed to create user");

  await db(deps)(
    "INSERT INTO auth_providers(user_id, provider, provider_id) VALUES($1, 'email', $2) ON CONFLICT(provider, provider_id) DO NOTHING",
    [userId, normalizedEmail]
  );
  
  // Send welcome email for new users (fire and forget)
  if (isNewUser) {
    logger.info({ userId, email: normalizedEmail }, 'New user created, sending welcome email');
    emailService.sendWelcome({
      recipientEmail: normalizedEmail,
      recipientName: normalizedEmail.split('@')[0], // Use email prefix as temporary name
      language: 'en', // TODO: detect language
    }).catch((error) => {
      logger.error({ error, userId, email: normalizedEmail }, 'Failed to send welcome email');
    });
  }
  
  return userId;
}

export async function verifyMagicLinkToken(token: string, deviceId: string, deps?: AuthServiceDeps): Promise<AuthSession> {
  const tokenHash = hashToken(token);
  const magic = await db(deps)(
    "SELECT id,email,used_at,expires_at FROM magic_links WHERE token_hash=$1 ORDER BY expires_at DESC LIMIT 1",
    [tokenHash]
  ) as DbResult<MagicLinkRow>;

  const row = magic.rows[0];
  if (!row) {
    logger.warn("Invalid magic link token attempted");
    throw new BadRequestError("Invalid link");
  }
  if (row.used_at) {
    logger.warn({ email: row.email }, "Magic link already used");
    throw new BadRequestError("Link already used");
  }
  if (new Date(row.expires_at) <= (deps?.now?.() ?? new Date())) {
    logger.warn({ email: row.email }, "Magic link expired");
    throw new BadRequestError("Link expired. Request a new one.");
  }

  const marked = await db(deps)("UPDATE magic_links SET used_at=now() WHERE id=$1 AND used_at IS NULL RETURNING id", [row.id]);
  if (!marked.rowCount) {
    logger.warn({ email: row.email }, "Magic link race condition");
    throw new BadRequestError("Link already used");
  }

  logger.info({ email: row.email }, "Magic link verified successfully");
  const userId = await findOrCreateEmailUser(row.email, deps);
  return createSession(userId, deviceId, deps);
}

async function findOrCreateProviderUser(provider: "google" | "apple", providerId: string, email: string | undefined, deps?: AuthServiceDeps) {
  const existing = await db(deps)(
    "SELECT user_id AS id FROM auth_providers WHERE provider=$1 AND provider_id=$2 LIMIT 1",
    [provider, providerId]
  ) as DbResult<UserIdRow>;
  if (existing.rows[0]?.id) {
    await db(deps)("UPDATE users SET last_active=now() WHERE id=$1", [existing.rows[0].id]);
    return existing.rows[0].id;
  }

  const normalizedEmail = email?.toLowerCase() ?? `${providerId}@${provider}.local`;
  const userResult = await db(deps)(
    "INSERT INTO users(email, is_verified, last_active) VALUES($1, true, now()) ON CONFLICT(email) DO UPDATE SET last_active=now() RETURNING id",
    [normalizedEmail]
  ) as DbResult<UserIdRow>;
  const userId = userResult.rows[0]?.id;
  if (!userId) throw new Error("Failed to create OAuth user");

  await db(deps)(
    "INSERT INTO auth_providers(user_id, provider, provider_id) VALUES($1, $2, $3) ON CONFLICT(provider, provider_id) DO NOTHING",
    [userId, provider, providerId]
  );
  return userId;
}

export async function verifyGoogleToken(idToken: string, deviceId: string, deps?: AuthServiceDeps): Promise<AuthSession> {
  if (!deps?.verifyGoogleIdToken && !config.GOOGLE_CLIENT_ID) throw new HttpError(500, "GOOGLE_CLIENT_ID is not configured");
  const payload = deps?.verifyGoogleIdToken
    ? await deps.verifyGoogleIdToken(idToken, config.GOOGLE_CLIENT_ID ?? "")
    : (await googleClient.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID
    })).getPayload();
  if (!payload?.sub) throw new HttpError(400, "Invalid Google token");
  const userId = await findOrCreateProviderUser("google", payload.sub, payload.email, deps);
  return createSession(userId, deviceId, deps);
}

function getAppleSigningKey(header: JwtHeader, callback: SigningKeyCallback) {
  if (!header.kid) {
    callback(new Error("Apple token is missing kid"));
    return;
  }
  appleClient.getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error);
      return;
    }
    callback(null, key?.getPublicKey());
  });
}

export async function verifyAppleIdentityToken(identityToken: string, deviceId: string, deps?: AuthServiceDeps): Promise<AuthSession> {
  const payload = deps?.verifyAppleJwt ? await deps.verifyAppleJwt(identityToken) : await new Promise<JwtPayload>((resolve, reject) => {
    jwt.verify(
      identityToken,
      getAppleSigningKey,
      { algorithms: ["RS256"], audience: config.APPLE_AUDIENCE, issuer: "https://appleid.apple.com" },
      (error, decoded) => {
        if (error) {
          reject(new HttpError(400, "Invalid Apple token"));
          return;
        }
        if (!decoded || typeof decoded === "string") {
          reject(new HttpError(400, "Invalid Apple token"));
          return;
        }
        resolve(decoded);
      }
    );
  });
  if (!payload.sub) throw new HttpError(400, "Invalid Apple token");
  const userId = await findOrCreateProviderUser("apple", payload.sub, typeof payload.email === "string" ? payload.email : undefined, deps);
  return createSession(userId, deviceId, deps);
}

export async function refreshSession(refreshToken: string, deviceId: string, deps?: AuthServiceDeps): Promise<AuthSession> {
  const tokenHash = hashToken(refreshToken);
  const result = await db(deps)(
    "SELECT * FROM refresh_tokens WHERE token_hash=$1 LIMIT 1",
    [tokenHash]
  ) as DbResult<RefreshTokenRow>;
  const record = result.rows[0];
  if (!record) throw new HttpError(401, "Refresh token invalid");

  try {
    const rotated = await rotateRefreshToken({
      id: record.id,
      userId: record.user_id,
      deviceId: record.device_id,
      token: refreshToken,
      tokenHash: record.token_hash,
      expiresAt: record.expires_at,
      revokedAt: record.revoked_at
    }, deviceId);
    await db(deps)("UPDATE refresh_tokens SET revoked_at=$1 WHERE id=$2", [rotated.previous.revokedAt, rotated.previous.id]);
    await db(deps)("INSERT INTO refresh_tokens(id,user_id,token_hash,device_id,expires_at) VALUES($1,$2,$3,$4,$5)", [
      rotated.next.id, rotated.next.userId, rotated.next.tokenHash, rotated.next.deviceId, rotated.next.expiresAt
    ]);
    return {
      accessToken: createAccessToken(rotated.next.userId),
      refreshToken: rotated.next.token,
      userId: rotated.next.userId
    };
  } catch (error) {
    throw new HttpError(401, error instanceof Error ? error.message : "Refresh token invalid");
  }
}

export async function revokeAllRefreshTokensForSession(refreshToken: string, deps?: AuthServiceDeps) {
  const tokenHash = hashToken(refreshToken);
  const result = await db(deps)("SELECT user_id AS id FROM refresh_tokens WHERE token_hash=$1 LIMIT 1", [tokenHash]) as DbResult<UserIdRow>;
  const userId = result.rows[0]?.id;
  if (!userId) return;
  await db(deps)("UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [userId]);
}
