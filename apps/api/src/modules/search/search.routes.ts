import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { commonSchemas } from "../../http/validation.js";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { q, limit } = z.object({
    q: z.string().min(1).max(80),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }).parse(req.query);
  const like = `%${q}%`;
  const [people, events, communities] = await Promise.all([
    query("SELECT user_id,name,city,languages,cultures,interests FROM profiles WHERE user_id<>$1 AND is_hidden=false AND (name ILIKE $2 OR city ILIKE $2 OR $3 = ANY(languages) OR $3 = ANY(cultures)) LIMIT $4", [userId, like, q, limit]),
    query("SELECT id,title,city,starts_at FROM events WHERE title ILIKE $1 OR city ILIKE $1 LIMIT $2", [like, limit]),
    query("SELECT id,name,city FROM communities WHERE name ILIKE $1 OR city ILIKE $1 LIMIT $2", [like, limit]),
  ]);
  res.json({ people: people.rows, events: events.rows, communities: communities.rows });
}));
