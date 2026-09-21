import { query as defaultQuery } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";

type DbResult<T> = { rows: T[]; rowCount: number | null };
type DbQuery = (text: string, params?: unknown[]) => Promise<DbResult<unknown>>;

type ConversationParticipants = {
  user1_id: string;
  user2_id: string;
};

export type MessageType = "text" | "image" | "reaction" | "icebreaker";

export type SendMessageInput = {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
};

type ChatServiceDeps = {
  query?: DbQuery;
};

function db(deps?: ChatServiceDeps): DbQuery {
  return (deps?.query ?? defaultQuery) as DbQuery;
}

export async function listConversations(userId: string, cursor?: string | null, limit: number = 10, deps?: ChatServiceDeps) {
  const cursorClause = cursor ? "AND (c.last_message_at IS NOT NULL AND c.last_message_at < $2::timestamptz)" : "";
  return db(deps)(
    `SELECT
       c.id,
       c.match_id,
       c.created_at,
       c.last_message_at,
       p.user_id AS peer_id,
       p.name AS peer_name,
       ph.thumbnail_url,
       lm.content AS last_message_content,
       lm.type AS last_message_type,
       lm.sender_id AS last_message_sender_id,
       lm.created_at AS last_message_created_at,
       COUNT(m_unread.id)::int AS unread_count
     FROM conversations c
     JOIN matches mt ON mt.id=c.match_id
     JOIN profiles p ON p.user_id = CASE WHEN mt.user1_id=$1 THEN mt.user2_id ELSE mt.user1_id END
     LEFT JOIN photos ph ON ph.user_id=p.user_id AND ph.is_primary=true
     LEFT JOIN LATERAL (
       SELECT content, type, sender_id, created_at
       FROM messages
       WHERE conversation_id=c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true
     LEFT JOIN messages m_unread ON m_unread.conversation_id=c.id AND m_unread.sender_id <> $1 AND m_unread.read_at IS NULL
     WHERE (mt.user1_id=$1 OR mt.user2_id=$1) AND mt.unmatched_at IS NULL ${cursorClause}
     GROUP BY c.id, p.user_id, p.name, ph.thumbnail_url, lm.content, lm.type, lm.sender_id, lm.created_at
     ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
     LIMIT ${limit + 1}`,
    cursor ? [userId, cursor] : [userId]
  );
}

export async function getConversationRecipient(conversationId: string, senderId: string, deps?: ChatServiceDeps) {
  const conversation = await db(deps)(
    `SELECT mt.user1_id, mt.user2_id
     FROM conversations c
     JOIN matches mt ON mt.id=c.match_id
     WHERE c.id=$1 AND mt.unmatched_at IS NULL
     LIMIT 1`,
    [conversationId]
  ) as DbResult<ConversationParticipants>;
  const row = conversation.rows[0];
  if (!row || (row.user1_id !== senderId && row.user2_id !== senderId)) {
    throw new HttpError(403, "Conversation unavailable");
  }

  const recipientId = row.user1_id === senderId ? row.user2_id : row.user1_id;
  const blocks = await db(deps)(
    `SELECT id FROM blocks
     WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)
     LIMIT 1`,
    [senderId, recipientId]
  );
  if (blocks.rowCount) throw new HttpError(403, "Conversation blocked");
  return recipientId;
}

export async function sendConversationMessage(input: SendMessageInput, deps?: ChatServiceDeps) {
  const recipientId = await getConversationRecipient(input.conversationId, input.senderId, deps);
  const message = await db(deps)(
    "INSERT INTO messages(conversation_id,sender_id,content,type) VALUES($1,$2,$3,$4) RETURNING *",
    [input.conversationId, input.senderId, input.content, input.type ?? "text"]
  );
  await db(deps)("UPDATE conversations SET last_message_at=now() WHERE id=$1", [input.conversationId]);
  return { message: message.rows[0], recipientId };
}
