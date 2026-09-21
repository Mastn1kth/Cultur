import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { getCurrentUser, mergeProfilePatch, onboardingStepValues, updateCurrentUser } from "./users.service.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const visibility = z.enum(["public", "matches", "private", "matching_only"]);
const currentUserPatchSchema = z.object({
  onboarding_step: z.enum(onboardingStepValues).optional()
}).strict();
const profileSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(18).max(99),
  bio: z.string().max(300).optional(),
  city: z.string().min(1),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  goal: z.enum(["friends", "dating", "events", "community", "all"]),
  languages: z.array(z.string()).min(1),
  cultures: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  religion: z.string().optional(),
  religion_visibility: visibility.default("private"),
  sexuality: z.string().optional(),
  sexuality_visibility: visibility.default("private"),
  ethnicity: z.string().optional(),
  ethnicity_visibility: visibility.default("private"),
  politics: z.string().optional(),
  politics_visibility: visibility.default("private"),
  family_values: z.string().optional(),
  i_can_teach: z.string().optional(),
  i_miss_from_home: z.string().optional(),
  favorite_tradition: z.string().optional(),
  looking_for: z.string().optional(),
  university: z.string().optional()
});

usersRouter.get("/me", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  res.json(await getCurrentUser(userId));
}));

usersRouter.patch("/me", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = currentUserPatchSchema.parse(req.body);
  res.json(await updateCurrentUser(userId, body));
}));

usersRouter.get("/:id/profile", asyncHandler(async (req, res) => {
  const requesterId = (req as AuthedRequest).userId;
  const result = await query(
    `SELECT
       p.user_id, p.name, p.age, p.bio, p.city, p.country, p.goal,
       p.languages, p.cultures, p.interests,
       CASE WHEN p.user_id=$1 OR p.religion_visibility='public' THEN p.religion ELSE NULL END AS religion,
       CASE WHEN p.user_id=$1 OR p.sexuality_visibility='public' THEN p.sexuality ELSE NULL END AS sexuality,
       CASE WHEN p.user_id=$1 OR p.ethnicity_visibility='public' THEN p.ethnicity ELSE NULL END AS ethnicity,
       CASE WHEN p.user_id=$1 OR p.politics_visibility='public' THEN p.politics ELSE NULL END AS politics,
       p.family_values, p.i_can_teach, p.i_miss_from_home, p.favorite_tradition, p.looking_for, p.university,
       ph.url AS photo_url, ph.thumbnail_url
     FROM profiles p
     JOIN users u ON u.id=p.user_id
     LEFT JOIN photos ph ON ph.user_id=p.user_id AND ph.is_primary=true
     WHERE p.user_id=$2 AND (p.is_hidden=false OR p.user_id=$1) AND u.deleted_at IS NULL AND u.is_banned=false
     LIMIT 1`,
    [requesterId, req.params.id]
  );
  res.json(result.rows[0] ?? null);
}));

usersRouter.put("/me/profile", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = profileSchema.parse(req.body);
  const complete = Math.round((["name", "age", "city", "languages", "interests", "goal"] as const).filter((key) => {
    const value = body[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length / 6 * 100);
  const result = await query(
    `INSERT INTO profiles(
      user_id,name,age,bio,city,country,latitude,longitude,location,goal,languages,cultures,interests,
      religion,religion_visibility,sexuality,sexuality_visibility,ethnicity,ethnicity_visibility,politics,politics_visibility,
      family_values,i_can_teach,i_miss_from_home,favorite_tradition,looking_for,university,profile_complete_pct,updated_at
    ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $7::float IS NULL OR $8::float IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($8,$7),4326)::geography END,
      $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,now()
    )
    ON CONFLICT(user_id) DO UPDATE SET
      name=excluded.name, age=excluded.age, bio=excluded.bio, city=excluded.city, country=excluded.country,
      latitude=excluded.latitude, longitude=excluded.longitude, location=excluded.location, goal=excluded.goal,
      languages=excluded.languages, cultures=excluded.cultures, interests=excluded.interests,
      religion=excluded.religion, religion_visibility=excluded.religion_visibility,
      sexuality=excluded.sexuality, sexuality_visibility=excluded.sexuality_visibility,
      ethnicity=excluded.ethnicity, ethnicity_visibility=excluded.ethnicity_visibility,
      politics=excluded.politics, politics_visibility=excluded.politics_visibility,
      family_values=excluded.family_values, i_can_teach=excluded.i_can_teach, i_miss_from_home=excluded.i_miss_from_home,
      favorite_tradition=excluded.favorite_tradition, looking_for=excluded.looking_for, university=excluded.university,
      profile_complete_pct=excluded.profile_complete_pct, updated_at=now()
    RETURNING *`,
    [userId, body.name, body.age, body.bio, body.city, body.country, body.latitude, body.longitude, body.goal, body.languages, body.cultures, body.interests,
      body.religion, body.religion_visibility, body.sexuality, body.sexuality_visibility, body.ethnicity, body.ethnicity_visibility,
      body.politics, body.politics_visibility, body.family_values, body.i_can_teach, body.i_miss_from_home, body.favorite_tradition,
      body.looking_for, body.university, complete]
  );
  res.json(result.rows[0]);
}));

usersRouter.patch("/me/profile", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = profileSchema.partial().parse(req.body);
  const existing = await query("SELECT * FROM profiles WHERE user_id=$1", [userId]);
  const current = existing.rows[0] ?? {};
  const next = mergeProfilePatch(body, current);
  const complete = Math.round((["name", "age", "city", "languages", "interests", "goal"] as const).filter((key) => {
    const value = next[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length / 6 * 100);
  const result = await query(
    `INSERT INTO profiles(
      user_id,name,age,bio,city,country,latitude,longitude,location,goal,languages,cultures,interests,
      religion,religion_visibility,sexuality,sexuality_visibility,ethnicity,ethnicity_visibility,politics,politics_visibility,
      family_values,i_can_teach,i_miss_from_home,favorite_tradition,looking_for,university,profile_complete_pct,updated_at
    ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $7::float IS NULL OR $8::float IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($8,$7),4326)::geography END,
      $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,now()
    )
    ON CONFLICT(user_id) DO UPDATE SET
      name=excluded.name, age=excluded.age, bio=excluded.bio, city=excluded.city, country=excluded.country,
      latitude=excluded.latitude, longitude=excluded.longitude, location=excluded.location, goal=excluded.goal,
      languages=excluded.languages, cultures=excluded.cultures, interests=excluded.interests,
      religion=excluded.religion, religion_visibility=excluded.religion_visibility,
      sexuality=excluded.sexuality, sexuality_visibility=excluded.sexuality_visibility,
      ethnicity=excluded.ethnicity, ethnicity_visibility=excluded.ethnicity_visibility,
      politics=excluded.politics, politics_visibility=excluded.politics_visibility,
      family_values=excluded.family_values, i_can_teach=excluded.i_can_teach, i_miss_from_home=excluded.i_miss_from_home,
      favorite_tradition=excluded.favorite_tradition, looking_for=excluded.looking_for, university=excluded.university,
      profile_complete_pct=excluded.profile_complete_pct, updated_at=now()
    RETURNING *`,
    [userId, next.name, next.age, next.bio, next.city, next.country, next.latitude, next.longitude, next.goal, next.languages, next.cultures, next.interests,
      next.religion, next.religion_visibility, next.sexuality, next.sexuality_visibility, next.ethnicity, next.ethnicity_visibility,
      next.politics, next.politics_visibility, next.family_values, next.i_can_teach, next.i_miss_from_home, next.favorite_tradition,
      next.looking_for, next.university, complete]
  );
  res.json(result.rows[0]);
}));

usersRouter.post("/me/hide", asyncHandler(async (req, res) => {
  const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body);
  await query("UPDATE profiles SET is_hidden=$1 WHERE user_id=$2", [hidden, (req as AuthedRequest).userId]);
  res.json({ ok: true });
}));

usersRouter.delete("/me", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  await query("UPDATE users SET deleted_at=now() WHERE id=$1", [userId]);
  await query("UPDATE profiles SET is_hidden=true, name='Deleted user', bio=NULL WHERE user_id=$1", [userId]);
  await query("UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1", [userId]);
  res.json({ ok: true, anonymizeAfterDays: 30 });
}));
