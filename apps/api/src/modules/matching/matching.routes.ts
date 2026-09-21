import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { requireAuth, type AuthedRequest } from "../../http/auth-middleware.js";
import { asyncHandler } from "../../http/errors.js";
import { commonSchemas, paginatedResponse } from "../../http/validation.js";
import { createModuleLogger } from "../../lib/logger.js";
import { emailService } from "../../lib/email/index.js";
import { calculateCompatibility } from "../discovery/compatibility.js";
import { sendPushToUser } from "../notifications/notifications.service.js";

const logger = createModuleLogger("matching");

export const matchingRouter = Router();
matchingRouter.use(requireAuth);

matchingRouter.post("/swipes", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const body = z.object({
    swipedId: z.string().uuid().optional(),
    swiped_id: z.string().uuid().optional(),
    action: z.enum(["like", "skip", "superlike"])
  }).refine((value) => value.swipedId || value.swiped_id, { message: "swiped_id is required" }).parse(req.body);
  const swipedId = body.swipedId ?? body.swiped_id!;
  const { action } = body;
  await query(
    "INSERT INTO swipes(swiper_id, swiped_id, action) VALUES($1,$2,$3) ON CONFLICT(swiper_id, swiped_id) DO UPDATE SET action=excluded.action, created_at=now()",
    [userId, swipedId, action]
  );
  let match = null;
  if (action === "like" || action === "superlike") {
    const reciprocal = await query("SELECT id FROM swipes WHERE swiper_id=$1 AND swiped_id=$2 AND action IN ('like','superlike')", [swipedId, userId]);
    if (reciprocal.rowCount) {
      const ordered = [userId, swipedId].sort();
      const matchResult = await query<{ id: string }>(
        "INSERT INTO matches(user1_id,user2_id) VALUES($1,$2) ON CONFLICT(user1_id,user2_id) DO UPDATE SET unmatched_at=NULL RETURNING id",
        ordered
      );
      await query("INSERT INTO conversations(match_id,last_message_at) VALUES($1,now()) ON CONFLICT DO NOTHING", [matchResult.rows[0].id]);
      match = { id: matchResult.rows[0].id };
      
      // Get full profiles for notifications
      const profiles = await query<{ 
        user_id: string; 
        name: string; 
        email: string;
        languages: string[];
        cultures: string[];
        interests: string[];
        latitude: number | null;
        longitude: number | null;
        goal: string | null;
        religion: string | null;
        religion_visibility: 'public' | 'matches' | 'private' | 'matching_only' | null;
        family_values: string | null;
        university: string | null;
        city: string | null;
      }>(
        `SELECT u.email, p.user_id, p.name, p.languages, p.cultures, p.interests,
                p.latitude, p.longitude, p.goal, p.religion, p.religion_visibility,
                p.family_values, p.university, p.city
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.user_id = ANY($1::uuid[])`,
        [[userId, swipedId]]
      );
      
      const photos = await query<{ user_id: string; thumbnail_url: string }>(
        "SELECT user_id, thumbnail_url FROM photos WHERE user_id = ANY($1::uuid[]) AND is_primary = true",
        [[userId, swipedId]]
      );
      
      const currentProfile = profiles.rows.find((p) => p.user_id === userId);
      const peerProfile = profiles.rows.find((p) => p.user_id === swipedId);
      const currentName = currentProfile?.name ?? "CultureMatch";
      const peerName = peerProfile?.name ?? "CultureMatch";
      
      // Calculate compatibility score
      let compatibilityScore = 75; // Default
      if (currentProfile && peerProfile) {
        const compat = calculateCompatibility(currentProfile, peerProfile);
        compatibilityScore = compat.score;
      }
      
      // Send push notifications
      await Promise.all([
        sendPushToUser(userId, "Новый матч!", `Вы совпали с ${peerName}`, { type: "new_match", matchId: matchResult.rows[0].id }),
        sendPushToUser(swipedId, "Новый матч!", `Вы совпали с ${currentName}`, { type: "new_match", matchId: matchResult.rows[0].id })
      ]);
      
      // Send email notifications (fire and forget)
      if (currentProfile && peerProfile) {
        const peerPhoto = photos.rows.find((p) => p.user_id === swipedId);
        const currentPhoto = photos.rows.find((p) => p.user_id === userId);
        
        // Email to current user
        emailService.sendMatchNotification({
          recipientEmail: currentProfile.email,
          recipientName: currentName,
          matchName: peerName,
          matchPhotoUrl: peerPhoto?.thumbnail_url,
          compatibilityScore,
          language: 'en', // TODO: detect from user preferences
        }).catch((error) => {
          logger.error({ error, userId }, 'Failed to send match notification email');
        });
        
        // Email to peer user
        emailService.sendMatchNotification({
          recipientEmail: peerProfile.email,
          recipientName: peerName,
          matchName: currentName,
          matchPhotoUrl: currentPhoto?.thumbnail_url,
          compatibilityScore,
          language: 'en', // TODO: detect from user preferences
        }).catch((error) => {
          logger.error({ error, userId: swipedId }, 'Failed to send match notification email');
        });
        
        logger.info({ matchId: matchResult.rows[0].id, user1: userId, user2: swipedId }, 'Match created, notifications sent');
      }
    }
  }
  res.json({ matched: Boolean(match), match });
}));

matchingRouter.get("/matches", asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const { cursor, limit } = commonSchemas.cursor.parse(req.query);
  const cursorClause = cursor ? "AND m.matched_at < $2::timestamptz" : "";
  const result = await query(
    `SELECT m.*, p.name, p.age, ph.thumbnail_url
     FROM matches m
     JOIN profiles p ON p.user_id = CASE WHEN m.user1_id=$1 THEN m.user2_id ELSE m.user1_id END
     LEFT JOIN photos ph ON ph.user_id=p.user_id AND ph.is_primary=true
     WHERE (m.user1_id=$1 OR m.user2_id=$1) AND m.unmatched_at IS NULL ${cursorClause}
     ORDER BY m.matched_at DESC LIMIT ${limit + 1}`,
    cursor ? [userId, cursor] : [userId]
  );
  res.json(paginatedResponse(result.rows, limit));
}));
