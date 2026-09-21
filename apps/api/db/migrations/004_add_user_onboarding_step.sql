-- Up migration
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR NOT NULL DEFAULT 'welcome';

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_onboarding_step_check
    CHECK (onboarding_step IN ('welcome','city','languages','culture','interests','photo','complete'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE users
SET onboarding_step='complete'
WHERE onboarding_step='welcome'
  AND EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id=users.id AND p.profile_complete_pct >= 100
  );

-- Down migration
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_onboarding_step_check;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_step;
