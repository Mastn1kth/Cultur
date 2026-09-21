export type DiscoveryQueryArgs = {
  userId: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  limit: number;
  goal?: string | null;
  cursor?: string | null;
};

export function buildDiscoveryCandidateQuery(args: DiscoveryQueryArgs) {
  const radiusKm = Math.min(args.radiusKm, 700);
  return {
    sql: `SELECT p.*, ph.url AS photo_url,
      CASE WHEN p.location IS NOT NULL AND $2::float IS NOT NULL AND $3::float IS NOT NULL
        THEN ST_Distance(p.location, ST_SetSRID(ST_MakePoint($3,$2),4326)::geography) / 1000
        ELSE NULL END AS distance_km
     FROM profiles p
     JOIN users u ON u.id=p.user_id
     LEFT JOIN photos ph ON ph.user_id=p.user_id AND ph.is_primary=true
     WHERE p.user_id <> $1 AND p.is_hidden=false AND u.deleted_at IS NULL AND u.is_banned=false
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=$1))
       AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id=$1 AND s.swiped_id=p.user_id)
       AND ($4::text IS NULL OR p.goal=$4::profile_goal OR p.goal='all')
       AND ($6::timestamptz IS NULL OR p.updated_at < $6::timestamptz)
       AND (
         $2::float IS NULL OR $3::float IS NULL OR p.location IS NULL OR
         ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($3,$2),4326)::geography, $5::float * 1000)
       )
     ORDER BY p.updated_at DESC
     LIMIT $7`,
    params: [args.userId, args.latitude, args.longitude, args.goal ?? null, radiusKm, args.cursor ?? null, args.limit]
  };
}
