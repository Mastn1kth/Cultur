-- Up migration
ALTER TABLE compatibility_cache
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours';

CREATE INDEX IF NOT EXISTS compatibility_cache_expires_idx ON compatibility_cache(expires_at);
CREATE INDEX IF NOT EXISTS compatibility_cache_pair_idx ON compatibility_cache(user1_id, user2_id, calculated_at DESC);

CREATE OR REPLACE FUNCTION cleanup_expired_compatibility_cache()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM compatibility_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Down migration
DROP FUNCTION IF EXISTS cleanup_expired_compatibility_cache();
DROP INDEX IF EXISTS compatibility_cache_pair_idx;
DROP INDEX IF EXISTS compatibility_cache_expires_idx;
ALTER TABLE compatibility_cache DROP COLUMN IF EXISTS expires_at;
