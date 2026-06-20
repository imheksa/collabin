import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const matchId = req.query.matchId;
  if (!matchId || !/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Valid matchId query param required' });
  }

  const { data, error } = await supabase
    .from('matches')
    .select('verification_status, verification_notes, winner_username, verified_signature')
    .eq('id', matchId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Match not found' });
  }

  return res.status(200).json({
    status: data.verification_status,
    winner: data.winner_username,
    notes: data.verification_notes,
    signature: data.verification_status === 'verified' ? data.verified_signature : undefined,
  });
}
