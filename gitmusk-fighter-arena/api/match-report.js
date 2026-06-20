const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIGNING_SECRET = process.env.MATCH_SIGNING_SECRET || 'dev-secret-change-me';

function sb(path, opts) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const base = opts || {};
  return fetch(`${url}/rest/v1/${path}`, {
    ...base,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(base.headers || {}),
    },
  });
}

async function signMatch(matchId, winnerUsername, duration) {
  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    'raw', enc.encode(SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', keyData, enc.encode(matchId + ':' + winnerUsername + ':' + duration));
  return Array.from(new Uint8Array(sig)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function runHeuristics(report, match) {
  var notes = [];
  if (report.duration < 3) notes.push('suspiciously_short_match');
  if (report.duration > 120) notes.push('match_exceeded_time_limit');

  var totalDmg = report.p1_total_damage + report.p2_total_damage;
  var totalHits = report.p1_total_hits + report.p2_total_hits;

  if (totalHits === 0 && !report.disconnected) notes.push('zero_hits_no_disconnect');
  if (totalDmg > 1000) notes.push('abnormally_high_damage');
  if (totalHits > 0 && totalDmg / totalHits > 80) notes.push('damage_per_hit_too_high');

  var loserHp = report.winner_username === match.player1_username ? report.p2_final_hp : report.p1_final_hp;
  var winnerHp = report.winner_username === match.player1_username ? report.p1_final_hp : report.p2_final_hp;
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

  var body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  var matchId = (body && body.matchId) || '';
  var reporter = (body && body.reporter) || '';
  var winnerUsername = (body && body.winnerUsername) || '';
  var duration = body && body.duration;
  var maxCombo = body && body.maxCombo;
  var p1TotalDamage = body && body.p1TotalDamage;
  var p2TotalDamage = body && body.p2TotalDamage;
  var p1TotalHits = body && body.p1TotalHits;
  var p2TotalHits = body && body.p2TotalHits;
  var p1FinalHp = body && body.p1FinalHp;
  var p2FinalHp = body && body.p2FinalHp;
  var disconnected = body && body.disconnected;

  if (!matchId || !reporter || !winnerUsername) {
    return res.status(400).json({ error: 'matchId, reporter, and winnerUsername are required' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid matchId format' });
  }

  // Fetch match
  var matchRes = await sb('matches?id=eq.' + matchId + '&select=player1_username,player2_username,status,verification_status&limit=1');
  var matches = await matchRes.json();
  var match = Array.isArray(matches) ? matches[0] : null;

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
  var dupRes = await sb('match_reports?match_id=eq.' + matchId + '&reporter=eq.' + encodeURIComponent(reporter) + '&select=id&limit=1');
  var dups = await dupRes.json();
  if (Array.isArray(dups) && dups.length > 0) {
    return res.status(409).json({ error: 'Report already submitted by this player' });
  }

  var reportRow = {
    match_id: matchId,
    reporter: reporter,
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
  var insertRes = await sb('match_reports', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(reportRow),
  });
  if (!insertRes.ok) {
    console.error('match-report insert error:', await insertRes.text());
    return res.status(500).json({ error: 'Failed to save report' });
  }

  // Fetch all reports for this match
  var allRes = await sb('match_reports?match_id=eq.' + matchId + '&select=*');
  var allReports = await allRes.json();

  if (!Array.isArray(allReports) || allReports.length < 2) {
    await sb('matches?id=eq.' + matchId, {
      method: 'PATCH',
      body: JSON.stringify({ verification_status: 'waiting', updated_at: new Date().toISOString() }),
    });
    return res.status(200).json({ ok: true, status: 'waiting', message: 'Report received, waiting for opponent' });
  }

  var r1 = allReports[0];
  var r2 = allReports[1];
  var winnersAgree = r1.winner_username === r2.winner_username;

  if (!winnersAgree) {
    await sb('matches?id=eq.' + matchId, {
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

  var agreedWinner = r1.winner_username;
  var heuristicNotes = runHeuristics(r1, match);
  var h2 = runHeuristics(r2, match);
  for (var i = 0; i < h2.length; i++) {
    if (heuristicNotes.indexOf(h2[i]) === -1) heuristicNotes.push(h2[i]);
  }

  var hasSuspicious = heuristicNotes.length > 0;
  var signature = await signMatch(matchId, agreedWinner, r1.duration);
  var finalStatus = hasSuspicious ? 'flagged' : 'verified';
  var notes = hasSuspicious ? heuristicNotes.join(', ') : 'consensus_verified';

  await sb('matches?id=eq.' + matchId, {
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
    notes: notes,
  });
}
