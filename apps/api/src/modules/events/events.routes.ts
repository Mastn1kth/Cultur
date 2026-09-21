import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { commonSchemas, paginatedResponse } from "../../http/validation.js";
import { getEventDetail, setEventAttendance } from "./events.service.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

eventsRouter.get("/", asyncHandler(async (req, res) => {
  const { cursor, limit } = commonSchemas.cursor.parse(req.query);
  const city = req.query.city ? String(req.query.city) : null;
  const cursorClause = cursor ? "AND e.starts_at > $2::timestamptz" : "";
  const result = await query(
    `SELECT e.*, COUNT(a.id)::int AS attendees_count
     FROM events e LEFT JOIN event_attendees a ON a.event_id=e.id AND a.status='going'
     WHERE ($1::text IS NULL OR e.city ILIKE $1) ${cursorClause}
     GROUP BY e.id ORDER BY e.starts_at ASC LIMIT ${limit + 1}`,
    cursor ? [city, cursor] : [city]
  );
  res.json(paginatedResponse(result.rows, limit));
}));

eventsRouter.get("/:id", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  res.json(await getEventDetail(String(req.params.id), userId));
}));

eventsRouter.post("/:id/attendees", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { status } = z.object({ status: z.enum(["going", "maybe"]) }).parse(req.body);
  await setEventAttendance(String(req.params.id), userId, status);
  res.json({ ok: true });
}));

eventsRouter.post("/", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    city: z.string().min(1),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().optional(),
    languages: z.array(z.string()).default([]),
    cultures: z.array(z.string()).default([]),
    interests: z.array(z.string()).default([]),
    max_attendees: z.number().int().positive().optional(),
    is_public: z.boolean().default(true)
  }).parse(req.body);
  const result = await query(
    "INSERT INTO events(creator_id,title,description,city,starts_at,ends_at,languages,cultures,interests,max_attendees,is_public) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",
    [userId, body.title, body.description, body.city, body.starts_at, body.ends_at, body.languages, body.cultures, body.interests, body.max_attendees, body.is_public]
  );
  res.status(201).json(result.rows[0]);
}));
