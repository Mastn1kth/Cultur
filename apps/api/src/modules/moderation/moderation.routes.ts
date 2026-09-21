import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";

export const moderationRouter = Router();
moderationRouter.use(requireAuth);

moderationRouter.post("/reports", asyncHandler(async (req, res) => {
  const body = z.object({
    reportedId: z.string().uuid(),
    reason: z.enum(["fake profile", "harassment", "spam", "inappropriate content", "scam"]),
    description: z.string().max(1000).optional()
  }).parse(req.body);
  const result = await query("INSERT INTO reports(reporter_id,reported_id,reason,description) VALUES($1,$2,$3,$4) RETURNING *", [
    (req as AuthedRequest).userId, body.reportedId, body.reason, body.description
  ]);
  res.status(201).json(result.rows[0]);
}));

moderationRouter.post("/blocks", asyncHandler(async (req, res) => {
  const { blockedId } = z.object({ blockedId: z.string().uuid() }).parse(req.body);
  await query("INSERT INTO blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [(req as AuthedRequest).userId, blockedId]);
  res.json({ ok: true });
}));

moderationRouter.get("/blocks", asyncHandler(async (req, res) => {
  const result = await query("SELECT b.*, p.name FROM blocks b JOIN profiles p ON p.user_id=b.blocked_id WHERE b.blocker_id=$1", [(req as AuthedRequest).userId]);
  res.json({ items: result.rows });
}));
