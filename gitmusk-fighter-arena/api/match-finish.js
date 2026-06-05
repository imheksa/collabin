import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { matchId, winnerUsername } = body ?? {};

  if (!matchId || !winnerUsername) {
    return res.status(400).json({ error: 'matchId and winnerUsername are required' });
  }

  // Validate matchId format (UUID) to prevent injection
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid matchId format' });
  }

  // Fetch match to verify winner is actually a participant
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('player1_username, player2_username, status')
    .eq('id', matchId)
    .single();

  if (fetchErr || !match) {
    return res.status(404).json({ error: 'Match not found' });
  }

  if (match.status === 'finished') {
    return res.status(409).json({ error: 'Match already finished' });
  }

  // Only the actual participants can be declared winners
  if (winnerUsername !== match.player1_username && winnerUsername !== match.player2_username) {
    return res.status(403).json({ error: 'Winner is not a match participant' });
  }

  const { error } = await supabase
    .from('matches')
    .update({ status: 'finished', winner_username: winnerUsername, updated_at: new Date().toISOString() })
    .eq('id', matchId)
    .in('status', ['active', 'pending']);

  if (error) {
    console.error('match-finish error:', error.message);
    return res.status(500).json({ error: 'Failed to finish match' });
  }

  return res.status(200).json({ ok: true });
}
