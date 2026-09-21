import { Router } from "express";
import { requireAuth } from "../../http/auth-middleware.js";

export const privacyRouter = Router();
privacyRouter.use(requireAuth);

privacyRouter.get("/center", (_req, res) => {
  res.json({
    collected: ["email", "profile fields you choose", "approximate location", "messages", "events and communities activity"],
    purpose: ["auth", "matching", "safety", "notifications"],
    sensitiveFields: ["religion", "sexuality", "ethnicity", "politics"],
    locationPolicy: "Only approximate distance is shown to other users.",
    deletion: "Soft delete immediately, anonymization after 30 days."
  });
});
