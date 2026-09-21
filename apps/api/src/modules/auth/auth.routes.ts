import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../http/errors.js";
import {
  createMagicLinkRequest,
  refreshSession,
  revokeAllRefreshTokensForSession,
  verifyAppleIdentityToken,
  verifyGoogleToken,
  verifyMagicLinkToken
} from "./auth.service.js";

export const authRouter = Router();

const deviceSchema = z.object({ deviceId: z.string().min(2).max(128).default("mobile") });
const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).optional(),
  refresh_token: z.string().min(20).optional(),
  deviceId: z.string().min(2).max(128).default("mobile")
}).refine((body) => body.refreshToken || body.refresh_token, { message: "refreshToken is required" });
const refreshTokenOnlySchema = z.object({
  refreshToken: z.string().min(20).optional(),
  refresh_token: z.string().min(20).optional()
}).refine((body) => body.refreshToken || body.refresh_token, { message: "refreshToken is required" });

authRouter.post("/magic/start", asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const magic = await createMagicLinkRequest(email);
  res.json({
    ok: true,
    message: "Magic link sent",
    ...(process.env.NODE_ENV === "production" ? {} : { devMagicLink: magic.link })
  });
}));

const verifyMagicSchema = z.object({
    token: z.string().min(20),
    deviceId: z.string().min(2).max(128).default("mobile")
});

authRouter.post("/verify", asyncHandler(async (req, res) => {
  const { token, deviceId } = verifyMagicSchema.parse(req.body);
  res.json(await verifyMagicLinkToken(token, deviceId));
}));

authRouter.post("/magic/verify", asyncHandler(async (req, res) => {
  const { token, deviceId } = verifyMagicSchema.extend({ email: z.string().email().optional() }).parse(req.body);
  res.json(await verifyMagicLinkToken(token, deviceId));
}));

authRouter.post("/oauth/:provider", asyncHandler(async (req, res) => {
  const provider = z.enum(["apple", "google"]).parse(req.params.provider);
  const { providerId, email, deviceId } = z.object({
    providerId: z.string().min(2),
    email: z.string().email().optional(),
    deviceId: z.string().min(2).default("mobile")
  }).parse(req.body);
  const token = provider === "google" ? providerId : providerId;
  res.json(provider === "google"
    ? await verifyGoogleToken(token, deviceId)
    : await verifyAppleIdentityToken(token, deviceId));
}));

authRouter.post("/google", asyncHandler(async (req, res) => {
  const { token, idToken, deviceId } = z.object({
    token: z.string().min(10).optional(),
    idToken: z.string().min(10).optional(),
    deviceId: z.string().min(2).max(128).default("mobile")
  }).refine((body) => body.token || body.idToken, { message: "token is required" }).parse(req.body);
  res.json(await verifyGoogleToken(token ?? idToken!, deviceId));
}));

authRouter.post("/apple", asyncHandler(async (req, res) => {
  const { token, identityToken, deviceId } = z.object({
    token: z.string().min(10).optional(),
    identityToken: z.string().min(10).optional(),
    deviceId: z.string().min(2).max(128).default("mobile")
  }).refine((body) => body.token || body.identityToken, { message: "identityToken is required" }).parse(req.body);
  res.json(await verifyAppleIdentityToken(token ?? identityToken!, deviceId));
}));

authRouter.post("/refresh", asyncHandler(async (req, res) => {
  const body = refreshBodySchema.parse(req.body);
  res.json(await refreshSession(body.refreshToken ?? body.refresh_token!, body.deviceId));
}));

authRouter.post("/logout", asyncHandler(async (req, res) => {
  const body = refreshTokenOnlySchema.parse(req.body);
  await revokeAllRefreshTokensForSession(body.refreshToken ?? body.refresh_token!);
  res.json({ ok: true });
}));
