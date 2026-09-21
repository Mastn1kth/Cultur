import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { commonSchemas, paginatedResponse } from "../../http/validation.js";
import { getCommunityDetail, leaveCommunity, listCommunityMessages, sendCommunityMessage } from "./communities.service.js";

export const communitiesRouter = Router();
communitiesRouter.use(requireAuth);

communitiesRouter.get("/", asyncHandler(async (req, res) => {
  const { cursor, limit } = commonSchemas.cursor.parse(req.query);
  const cursorClause = cursor ? "AND c.created_at < $1::timestamptz" : "";
  const result = await query(
    `SELECT c.*, COUNT(cm.id)::int AS members_count
     FROM communities c LEFT JOIN community_members cm ON cm.community_id=c.id
     WHERE 1=1 ${cursorClause}
     GROUP BY c.id ORDER BY members_count DESC, c.created_at DESC LIMIT ${limit + 1}`,
    cursor ? [cursor] : []
  );
  res.json(paginatedResponse(result.rows, limit));
}));

communitiesRouter.get("/:id", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  res.json(await getCommunityDetail(String(req.params.id), userId));
}));

communitiesRouter.get("/:id/messages", asyncHandler(async (req, res) => {
  const { cursor, limit } = commonSchemas.cursor.parse(req.query);
  const result = await listCommunityMessages(String(req.params.id), cursor, limit);
  res.json(paginatedResponse(result.rows, limit));
}));

communitiesRouter.post("/:id/join", asyncHandler(async (req, res) => {
  await query("INSERT INTO community_members(community_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT DO NOTHING", [req.params.id, (req as AuthedRequest).userId]);
  res.json({ ok: true });
}));

communitiesRouter.post("/:id/leave", asyncHandler(async (req, res) => {
  await leaveCommunity(String(req.params.id), (req as AuthedRequest).userId);
  res.json({ ok: true });
}));

communitiesRouter.post("/:id/messages", asyncHandler(async (req, res) => {
  const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);
  const message = await sendCommunityMessage(String(req.params.id), (req as AuthedRequest).userId, content);
  res.status(201).json(message);
}));

communitiesRouter.post("/", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    city: z.string().min(1),
    languages: z.array(z.string()).default([]),
    cultures: z.array(z.string()).default([]),
    interests: z.array(z.string()).default([]),
    max_members: z.number().int().min(5).max(20).default(20),
    is_public: z.boolean().default(true)
  }).parse(req.body);
  const result = await query(
    "INSERT INTO communities(creator_id,name,description,city,languages,cultures,interests,max_members,is_public) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
    [userId, body.name, body.description, body.city, body.languages, body.cultures, body.interests, body.max_members, body.is_public]
  );
  await query("INSERT INTO community_members(community_id,user_id,role) VALUES($1,$2,'admin')", [result.rows[0].id, userId]);
  res.status(201).json(result.rows[0]);
}));
