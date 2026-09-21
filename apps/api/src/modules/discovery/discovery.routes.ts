import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { calculateCompatibility } from "./compatibility.js";
import { buildDiscoveryCandidateQuery } from "./discovery.service.js";

export const discoveryRouter = Router();
discoveryRouter.use(requireAuth);

discoveryRouter.get("/", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const filters = z.object({
    radiusKm: z.coerce.number().min(1).max(700).default(50),
    cursor: z.string().optional(),
    goal: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(25).default(10)
  }).parse(req.query);
  const me = await query("SELECT * FROM profiles WHERE user_id=$1", [userId]);
  if (!me.rowCount) return res.json({ items: [], nextCursor: null });
  const mine = me.rows[0];
  const candidateQuery = buildDiscoveryCandidateQuery({
    userId,
    latitude: mine.latitude,
    longitude: mine.longitude,
    goal: filters.goal,
    radiusKm: filters.radiusKm,
    cursor: filters.cursor,
    limit: filters.limit + 1
  });
  const candidates = await query(candidateQuery.sql, candidateQuery.params);
  const pageRows = candidates.rows.slice(0, filters.limit);
  const items = candidates.rows.map((candidate) => {
    const compatibility = calculateCompatibility(mine, candidate);
    const distance = candidate.distance_km == null ? null : Math.round(Number(candidate.distance_km));
    return {
      ...candidate,
      latitude: undefined,
      longitude: undefined,
      location: undefined,
      compatibility,
      distanceLabel: distance == null ? "nearby" : distance <= 2 ? "within 2 km" : `${distance} km away`
    };
  }).slice(0, filters.limit).sort((a, b) => b.compatibility.score - a.compatibility.score);
  const hasMore = candidates.rows.length > filters.limit;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.updated_at ?? null : null;
  res.json({ items, nextCursor });
}));

discoveryRouter.get("/second-look", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const result = await query(
    `SELECT p.* FROM swipes s JOIN profiles p ON p.user_id=s.swiped_id
     WHERE s.swiper_id=$1 AND s.action='skip' AND s.created_at > now() - interval '7 days'
     ORDER BY random() LIMIT 10`,
    [userId]
  );
  res.json({ items: result.rows });
}));
