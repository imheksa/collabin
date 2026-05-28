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

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE match_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
