-- Run this in your Supabase SQL Editor

-- Match Queue: players waiting for a random opponent
CREATE TABLE IF NOT EXISTS match_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT NOT NULL,
  fighter_data JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'matched'
  match_id    UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE match_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on match_queue" ON match_queue;
CREATE POLICY "Read only on match_queue" ON match_queue FOR SELECT USING (true);

-- Matches: active and completed matches
CREATE TABLE IF NOT EXISTS matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_username  TEXT NOT NULL,
  player2_username  TEXT,
  player1_data      JSONB NOT NULL,
  player2_data      JSONB,
  status            TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'finished'
  winner_username   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on matches" ON matches;
CREATE POLICY "Read only on matches" ON matches FOR SELECT USING (true);

-- Player Stats: global leaderboard, upserted after every match
CREATE TABLE IF NOT EXISTS player_stats (
  username        TEXT PRIMARY KEY,
  display_name    TEXT,
  avatar_url      TEXT,
  level           INTEGER NOT NULL DEFAULT 1,
  xp              INTEGER NOT NULL DEFAULT 0,
  wins            INTEGER NOT NULL DEFAULT 0,
  losses          INTEGER NOT NULL DEFAULT 0,
  pvp_wins        INTEGER NOT NULL DEFAULT 0,
  max_combo       INTEGER NOT NULL DEFAULT 0,
  win_streak      INTEGER NOT NULL DEFAULT 0,
  max_win_streak  INTEGER NOT NULL DEFAULT 0,
  archetype       TEXT,
  archetype_label TEXT,
  fighter_color   TEXT DEFAULT '#b026ff',
  base_power      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on player_stats" ON player_stats;
CREATE POLICY "Read only on player_stats" ON player_stats FOR SELECT USING (true);

-- Season columns (add if upgrading existing table)
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS season_number  INTEGER     NOT NULL DEFAULT 1;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS season_wins    INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS season_losses  INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS season_pvp_wins INTEGER    NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS badges         TEXT[]      NOT NULL DEFAULT '{}';

-- Season config: single row tracks the active season window
CREATE TABLE IF NOT EXISTS season_config (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  season_number INTEGER      NOT NULL DEFAULT 1,
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ends_at       TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
-- Seed the first season (no-op if already exists)
INSERT INTO season_config (id, season_number, started_at, ends_at)
VALUES (1, 1, NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE season_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read on season_config" ON season_config FOR SELECT USING (true);

-- Season history: snapshot of top players at the end of every season
CREATE TABLE IF NOT EXISTS season_history (
  id            BIGSERIAL    PRIMARY KEY,
  season_number INTEGER      NOT NULL,
  username      TEXT         NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT         DEFAULT '',
  rank          INTEGER      NOT NULL,
  wins          INTEGER      NOT NULL DEFAULT 0,
  pvp_wins      INTEGER      NOT NULL DEFAULT 0,
  badge         TEXT         NOT NULL,
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE season_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read on season_history" ON season_history FOR SELECT USING (true);

-- Match reports: dual-client match result submissions for anti-cheat consensus
CREATE TABLE IF NOT EXISTS match_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id),
  reporter        TEXT NOT NULL,
  winner_username TEXT NOT NULL,
  duration        INTEGER NOT NULL,
  max_combo       INTEGER NOT NULL DEFAULT 0,
  p1_total_damage INTEGER NOT NULL DEFAULT 0,
  p2_total_damage INTEGER NOT NULL DEFAULT 0,
  p1_total_hits   INTEGER NOT NULL DEFAULT 0,
  p2_total_hits   INTEGER NOT NULL DEFAULT 0,
  p1_final_hp     REAL NOT NULL DEFAULT 0,
  p2_final_hp     REAL NOT NULL DEFAULT 0,
  disconnected    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_reports_match_id ON match_reports(match_id);

ALTER TABLE match_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert on match_reports" ON match_reports;
DROP POLICY IF EXISTS "Allow read on match_reports" ON match_reports;
-- No public policies — match_reports accessible only via service_role (API endpoints)

-- Verification columns on matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS verified_signature  TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS verification_notes  TEXT;
