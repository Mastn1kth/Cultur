CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE profile_goal AS ENUM ('friends','dating','events','community','all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE sensitive_visibility AS ENUM ('public','matches','private','matching_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('apple','google','email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE swipe_action AS ENUM ('like','skip','superlike');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text','image','reaction','icebreaker');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('going','maybe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE community_role AS ENUM ('admin','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending','reviewed','resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  phone VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ,
  onboarding_step VARCHAR NOT NULL DEFAULT 'welcome' CHECK (onboarding_step IN ('welcome','city','languages','culture','interests','photo','complete')),
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  age INT NOT NULL CHECK (age >= 18),
  bio VARCHAR(300),
  city VARCHAR NOT NULL,
  country VARCHAR,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(Point, 4326),
  goal profile_goal NOT NULL DEFAULT 'all',
  languages TEXT[] DEFAULT '{}',
  cultures TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  religion VARCHAR,
  religion_visibility sensitive_visibility DEFAULT 'private',
  sexuality VARCHAR,
  sexuality_visibility sensitive_visibility DEFAULT 'private',
  ethnicity VARCHAR,
  ethnicity_visibility sensitive_visibility DEFAULT 'private',
  politics VARCHAR,
  politics_visibility sensitive_visibility DEFAULT 'private',
  family_values VARCHAR,
  i_can_teach TEXT,
  i_miss_from_home TEXT,
  favorite_tradition TEXT,
  looking_for TEXT,
  university VARCHAR,
  is_hidden BOOLEAN DEFAULT false,
  profile_complete_pct INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_location_idx ON profiles USING GIST(location);
CREATE INDEX IF NOT EXISTS profiles_languages_idx ON profiles USING GIN(languages);
CREATE INDEX IF NOT EXISTS profiles_cultures_idx ON profiles USING GIN(cultures);

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_id VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_id VARCHAR NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action swipe_action NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT now(),
  unmatched_at TIMESTAMPTZ,
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  city VARCHAR NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(Point, 4326),
  languages TEXT[] DEFAULT '{}',
  cultures TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_attendees INT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  city VARCHAR NOT NULL,
  languages TEXT[] DEFAULT '{}',
  cultures TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  max_members INT DEFAULT 20,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role community_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR NOT NULL,
  description TEXT,
  status report_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS icebreakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR NOT NULL,
  language VARCHAR NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compatibility_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  breakdown JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);
