import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { registerPushToken } from "./notifications.service.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const pushTokenSchema = z.object({ token: z.string().min(10) });

const savePushToken = asyncHandler(async (req, res) => {
  const { token } = pushTokenSchema.parse(req.body);
  await registerPushToken((req as AuthedRequest).userId, token);
  res.status(201).json({ ok: true });
});

notificationsRouter.post("/push-token", savePushToken);
notificationsRouter.post("/register", savePushToken);

notificationsRouter.get("/settings", (_req, res) => {
  res.json({
    newMatch: true,
    newMessage: true,
    icebreakers: true,
    nearbyEvents: true,
    profileLikes: false,
    communities: true,
    profileReminder: true,
    reengagement: true
  });
});
