-- QUANTA schema (Module 1+)
-- Assumes Supabase JWT `sub` matches Clerk user id when using Clerk + Supabase JWT integration.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  streak_current INT DEFAULT 0,
  streak_longest INT DEFAULT 0,
  streak_last_played DATE,
  total_games_played INT DEFAULT 0,
  preferred_reminder_hour INT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('guesstimate','warmup','gk','wordplay','judgment')),
  category TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy','Medium','Hard')),
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  guesstimate_unit TEXT,
  guesstimate_dist_min BIGINT,
  guesstimate_dist_max BIGINT,
  fun_fact TEXT,
  source TEXT,
  week_theme TEXT,
  bizarre_score INT,
  used_on DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  guesstimate_id UUID REFERENCES questions(id),
  warmup_id UUID REFERENCES questions(id),
  gk_ids UUID[] NOT NULL,
  wordplay_id UUID REFERENCES questions(id),
  judgment_id UUID REFERENCES questions(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  daily_set_id UUID REFERENCES daily_sets(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'in_progress',
  total_score INT DEFAULT 0,
  round_scores JSONB,
  time_taken_seconds INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS leaderboard_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  score INT NOT NULL,
  rank_global INT,
  rank_percentile FLOAT,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id),
  addressee_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL,
  status TEXT NOT NULL,
  wiki_events_count INT DEFAULT 0,
  news_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_date ON game_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_daily_date_score ON leaderboard_daily(date, score DESC);
CREATE INDEX IF NOT EXISTS idx_questions_type_unused ON questions(type, used_on) WHERE used_on IS NULL;

-- RLS (only tables specified in product requirements)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- users: own row only (JWT sub = clerk_id)
CREATE POLICY users_select_own ON users
  FOR SELECT TO authenticated
  USING (clerk_id = (auth.jwt()->>'sub') AND deleted_at IS NULL);

CREATE POLICY users_insert_own ON users
  FOR INSERT TO authenticated
  WITH CHECK (clerk_id = (auth.jwt()->>'sub'));

CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (clerk_id = (auth.jwt()->>'sub'))
  WITH CHECK (clerk_id = (auth.jwt()->>'sub'));

-- game_sessions: own sessions
CREATE POLICY game_sessions_select_own ON game_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = game_sessions.user_id
        AND u.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY game_sessions_insert_own ON game_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = game_sessions.user_id
        AND u.clerk_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY game_sessions_update_own ON game_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = game_sessions.user_id
        AND u.clerk_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = game_sessions.user_id
        AND u.clerk_id = (auth.jwt()->>'sub')
    )
  );

-- leaderboard_daily: authenticated read; writes only via service_role (no insert/update policies)
CREATE POLICY leaderboard_daily_read ON leaderboard_daily
  FOR SELECT TO authenticated
  USING (true);

-- questions: only service_role can read (prevent cheating)
CREATE POLICY questions_no_client_read ON questions
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY questions_no_anon_read ON questions
  FOR SELECT TO anon
  USING (false);
