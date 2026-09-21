import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { commonSchemas, paginatedResponse } from "../../http/validation.js";
import { getConversationRecipient, listConversations, sendConversationMessage } from "./chat.service.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get("/conversations", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { cursor, limit } = commonSchemas.cursor.parse(req.query);
  const result = await listConversations(userId, cursor, limit);
  res.json(paginatedResponse(result.rows, limit));
}));

chatRouter.get("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const conversationId = String(req.params.id);
  await getConversationRecipient(conversationId, (req as AuthedRequest).userId);
  const { cursor, limit } = commonSchemas.cursor.parse(req.query);
  const cursorClause = cursor ? "AND m.created_at > $2::timestamptz" : "";
  const result = await query(
    `SELECT m.* FROM messages m WHERE m.conversation_id=$1 ${cursorClause} ORDER BY m.created_at ASC LIMIT ${limit + 1}`,
    cursor ? [conversationId, cursor] : [conversationId]
  );
  res.json(paginatedResponse(result.rows, limit));
}));

chatRouter.post("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const conversationId = String(req.params.id);
  const { content, type } = z.object({ content: z.string().min(1).max(2000), type: z.enum(["text", "image", "reaction", "icebreaker"]).default("text") }).parse(req.body);
  const result = await sendConversationMessage({ conversationId, senderId: userId, content, type });
  res.status(201).json(result.message);
}));

chatRouter.get("/icebreakers", asyncHandler(async (req, res) => {
  const queryParams = z.object({ conversationId: z.string().uuid().optional(), language: z.string().default("en") }).parse(req.query);
  if (queryParams.conversationId) {
    await getConversationRecipient(queryParams.conversationId, (req as AuthedRequest).userId);
  }
  const result = await query("SELECT * FROM icebreakers WHERE language=$1 ORDER BY random() LIMIT 3", [queryParams.language]);
  res.json({ items: result.rows });
}));
