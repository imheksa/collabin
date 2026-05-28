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
CREATE POLICY "Allow all on match_queue" ON match_queue FOR ALL USING (true);

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
CREATE POLICY "Allow all on matches" ON matches FOR ALL USING (true);

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
CREATE POLICY "Allow all on player_stats" ON player_stats FOR ALL USING (true);

-- Enable Realtime for match tables
ALTER PUBLICATION supabase_realtime ADD TABLE match_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
