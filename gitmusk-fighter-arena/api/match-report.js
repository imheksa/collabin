const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIGNING_SECRET = process.env.MATCH_SIGNING_SECRET || 'dev-secret-change-me';

function sb(path, opts = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(opts.headers || {}),
    },
  });
}

async function signMatch(matchId, winnerUsername, duration) {
  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    'raw', enc.encode(SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', keyData, enc.encode(`${matchId}:${winnerUsername}:${duration}`));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function runHeuristics(report, match) {
  const notes = [];
  if (report.duration < 3) notes.push('suspiciously_short_match');
  if (report.duration > 120) notes.push('match_exceeded_time_limit');

  const totalDmg = report.p1_total_damage + report.p2_total_damage;
  const totalHits = report.p1_total_hits + report.p2_total_hits;

  if (totalHits === 0 && !report.disconnected) notes.push('zero_hits_no_disconnect');
  if (totalDmg > 1000) notes.push('abnormally_high_damage');
  if (totalHits > 0 && totalDmg / totalHits > 80) notes.push('damage_per_hit_too_high');

  const loserHp = report.winner_username === match.player1_username ? report.p2_final_hp : report.p1_final_hp;
  const winnerHp = report.winner_username === match.player1_username ? report.p1_final_hp : report.p2_final_hp;
  if (loserHp > 0 && winnerHp <= loserHp && !report.disconnected) notes.push('winner_hp_inconsistent');

  return notes;
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    matchId, reporter, winnerUsername, duration, maxCombo,
    p1TotalDamage, p2TotalDamage, p1TotalHits, p2TotalHits,
    p1FinalHp, p2FinalHp, disconnected,
  } = body ?? {};

  if (!matchId || !reporter || !winnerUsername) {
    return res.status(400).json({ error: 'matchId, reporter, and winnerUsername are required' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid matchId format' });
  }

  // Fetch match
  const matchRes = await sb(`matches?id=eq.${matchId}&select=player1_username,player2_username,status,verification_status&limit=1`);
  const matches = await matchRes.json();
  const match = Array.isArray(matches) ? matches[0] : null;

  if (!match) return res.status(404).json({ error: 'Match not found' });

  if (reporter !== match.player1_username && reporter !== match.player2_username) {
    return res.status(403).json({ error: 'Reporter is not a match participant' });
  }
  if (winnerUsername !== match.player1_username && winnerUsername !== match.player2_username) {
    return res.status(403).json({ error: 'Winner is not a match participant' });
  }
  if (match.verification_status === 'verified' || match.verification_status === 'disputed') {
    return res.status(409).json({ error: 'Match already resolved', status: match.verification_status });
  }

  // Check for duplicate report
  const dupRes = await sb(`match_reports?match_id=eq.${matchId}&reporter=eq.${encodeURIComponent(reporter)}&select=id&limit=1`);
  const dups = await dupRes.json();
  if (Array.isArray(dups) && dups.length > 0) {
    return res.status(409).json({ error: 'Report already submitted by this player' });
  }

  const reportRow = {
    match_id: matchId,
    reporter,
    winner_username: winnerUsername,
    duration: Math.floor(Number(duration) || 0),
    max_combo: Math.floor(Number(maxCombo) || 0),
    p1_total_damage: Math.floor(Number(p1TotalDamage) || 0),
    p2_total_damage: Math.floor(Number(p2TotalDamage) || 0),
    p1_total_hits: Math.floor(Number(p1TotalHits) || 0),
    p2_total_hits: Math.floor(Number(p2TotalHits) || 0),
    p1_final_hp: Number(p1FinalHp) || 0,
    p2_final_hp: Number(p2FinalHp) || 0,
    disconnected: !!disconnected,
  };

  // Insert report
  const insertRes = await sb('match_reports', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(reportRow),
  });
  if (!insertRes.ok) {
    console.error('match-report insert error:', await insertRes.text());
    return res.status(500).json({ error: 'Failed to save report' });
  }

  // Fetch all reports for this match
  const allRes = await sb(`match_reports?match_id=eq.${matchId}&select=*`);
  const allReports = await allRes.json();

  if (!Array.isArray(allReports) || allReports.length < 2) {
    await sb(`matches?id=eq.${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ verification_status: 'waiting', updated_at: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true, status: 'waiting', message: 'Report received, waiting for opponent' });
  }

  const [r1, r2] = allReports;
  const winnersAgree = r1.winner_username === r2.winner_username;

  if (!winnersAgree) {
    await sb(`matches?id=eq.${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'finished',
        verification_status: 'disputed',
        verification_notes: 'Players disagree on winner',
        updated_at: new Date().toISOString(),
      }),
    });
    return res.status(200).json({ ok: true, status: 'disputed', message: 'Reports conflict — match disputed' });
  }

  const agreedWinner = r1.winner_username;
  const heuristicNotes = runHeuristics(r1, match);
  const h2 = runHeuristics(r2, match);
  for (const n of h2) { if (!heuristicNotes.includes(n)) heuristicNotes.push(n); }

  const hasSuspicious = heuristicNotes.length > 0;
  const signature = await signMatch(matchId, agreedWinner, r1.duration);
  const finalStatus = hasSuspicious ? 'flagged' : 'verified';
  const notes = hasSuspicious ? heuristicNotes.join(', ') : 'consensus_verified';

  await sb(`matches?id=eq.${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'finished',
      winner_username: agreedWinner,
      verification_status: finalStatus,
      verified_signature: signature,
      verification_notes: notes,
      updated_at: new Date().toISOString(),
    }),
  });

  return res.status(200).json({
    ok: true,
    status: finalStatus,
    winner: agreedWinner,
    signature: finalStatus === 'verified' ? signature : undefined,
    notes,
  });
}
