import { query as defaultQuery } from "../../db/pool.js";

type DbResult<T> = { rows: T[]; rowCount: number | null };
type DbQuery = (text: string, params?: unknown[]) => Promise<DbResult<unknown>>;

type CommunitiesServiceDeps = {
  query?: DbQuery;
};

export type CommunityDetail = {
  id: string;
  members_count: number;
  is_member: boolean;
  my_role: "admin" | "member" | null;
} & Record<string, unknown>;

export type CommunityMessage = {
  id: string;
  content: string;
  sender_name: string | null;
  sender_thumbnail_url: string | null;
} & Record<string, unknown>;

function db(deps?: CommunitiesServiceDeps): DbQuery {
  return (deps?.query ?? defaultQuery) as DbQuery;
}

export async function getCommunityDetail(communityId: string, userId: string, deps?: CommunitiesServiceDeps) {
  const result = await db(deps)(
    `SELECT
       c.*,
       COUNT(cm.id)::int AS members_count,
       (viewer.id IS NOT NULL) AS is_member,
       viewer.role AS my_role
     FROM communities c
     LEFT JOIN community_members cm ON cm.community_id=c.id
     LEFT JOIN community_members viewer ON viewer.community_id=c.id AND viewer.user_id=$2
     WHERE c.id=$1
     GROUP BY c.id, viewer.id, viewer.role
     LIMIT 1`,
    [communityId, userId]
  ) as DbResult<CommunityDetail>;
  return result.rows[0] ?? null;
}

export async function leaveCommunity(communityId: string, userId: string, deps?: CommunitiesServiceDeps) {
  await db(deps)("DELETE FROM community_members WHERE community_id=$1 AND user_id=$2", [communityId, userId]);
}

export async function listCommunityMessages(communityId: string, cursor?: string | null, limit: number = 20, deps?: CommunitiesServiceDeps) {
  const cursorClause = cursor ? "AND m.created_at > $2::timestamptz" : "";
  return db(deps)(
    `SELECT
       m.*,
       p.name AS sender_name,
       ph.thumbnail_url AS sender_thumbnail_url
     FROM community_messages m
     LEFT JOIN profiles p ON p.user_id=m.sender_id
     LEFT JOIN photos ph ON ph.user_id=m.sender_id AND ph.is_primary=true
     WHERE m.community_id=$1 ${cursorClause}
     ORDER BY m.created_at ASC
     LIMIT ${limit + 1}`,
    cursor ? [communityId, cursor] : [communityId]
  ) as Promise<DbResult<CommunityMessage>>;
}

export async function sendCommunityMessage(communityId: string, senderId: string, content: string, deps?: CommunitiesServiceDeps) {
  const result = await db(deps)(
    "INSERT INTO community_messages(community_id,sender_id,content) VALUES($1,$2,$3) RETURNING *",
    [communityId, senderId, content]
  );
  return result.rows[0];
}
