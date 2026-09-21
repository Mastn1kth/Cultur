-- Up migration
CREATE INDEX IF NOT EXISTS magic_links_token_hash_idx ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS magic_links_email_expires_idx ON magic_links(email, expires_at DESC);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_active_idx ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS swipes_swiper_swiped_idx ON swipes(swiper_id, swiped_id);
CREATE INDEX IF NOT EXISTS matches_user1_active_idx ON matches(user1_id) WHERE unmatched_at IS NULL;
CREATE INDEX IF NOT EXISTS matches_user2_active_idx ON matches(user2_id) WHERE unmatched_at IS NULL;
CREATE INDEX IF NOT EXISTS conversations_match_idx ON conversations(match_id);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS blocks_blocker_blocked_idx ON blocks(blocker_id, blocked_id);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens(user_id);

-- Down migration
DROP INDEX IF EXISTS push_tokens_user_idx;
DROP TABLE IF EXISTS push_tokens;
DROP INDEX IF EXISTS blocks_blocker_blocked_idx;
DROP INDEX IF EXISTS messages_conversation_created_idx;
DROP INDEX IF EXISTS conversations_match_idx;
DROP INDEX IF EXISTS matches_user2_active_idx;
DROP INDEX IF EXISTS matches_user1_active_idx;
DROP INDEX IF EXISTS swipes_swiper_swiped_idx;
DROP INDEX IF EXISTS refresh_tokens_user_active_idx;
DROP INDEX IF EXISTS refresh_tokens_token_hash_idx;
DROP INDEX IF EXISTS magic_links_email_expires_idx;
DROP INDEX IF EXISTS magic_links_token_hash_idx;
