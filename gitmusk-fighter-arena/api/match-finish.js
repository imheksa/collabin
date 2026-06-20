var ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://exarena.vercel.app';
var CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

var SIGNING_SECRET = process.env.MATCH_SIGNING_SECRET || 'dev-secret-change-me';

function sb(path, opts) {
  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;
  var base = opts || {};
  return fetch(url + '/rest/v1/' + path, {
    method: base.method || 'GET',
    headers: Object.assign({
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: 'Bearer ' + key,
    }, base.headers || {}),
    body: base.body,
  });
}

async function signMatch(matchId, winnerUsername, duration) {
  var enc = new TextEncoder();
  var keyData = await crypto.subtle.importKey(
    'raw', enc.encode(SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  var sig = await crypto.subtle.sign('HMAC', keyData, enc.encode(matchId + ':' + winnerUsername + ':' + duration));
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

// GET /api/match-finish?matchId=... → verification status
async function handleGetStatus(req, res) {
  var matchId = req.query.matchId;
  if (!matchId || !/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Valid matchId query param required' });
  }
  var r = await sb('matches?id=eq.' + matchId + '&select=verification_status,verification_notes,winner_username,verified_signature&limit=1');
  var rows = await r.json();
  var data = Array.isArray(rows) ? rows[0] : null;
  if (!data) return res.status(404).json({ error: 'Match not found' });
  return res.status(200).json({
    status: data.verification_status,
    winner: data.winner_username,
    notes: data.verification_notes,
    signature: data.verification_status === 'verified' ? data.verified_signature : undefined,
  });
}

// POST with reporter field → dual-client match report with consensus
async function handleMatchReport(body, res) {
  var matchId = body.matchId;
  var reporter = body.reporter;
  var winnerUsername = body.winnerUsername;

  if (!matchId || !reporter || !winnerUsername) {
    return res.status(400).json({ error: 'matchId, reporter, and winnerUsername are required' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid matchId format' });
  }

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

  var dupRes = await sb('match_reports?match_id=eq.' + matchId + '&reporter=eq.' + encodeURIComponent(reporter) + '&select=id&limit=1');
  var dups = await dupRes.json();
  if (Array.isArray(dups) && dups.length > 0) {
    return res.status(409).json({ error: 'Report already submitted by this player' });
  }

  var reportRow = {
    match_id: matchId,
    reporter: reporter,
    winner_username: winnerUsername,
    duration: Math.floor(Number(body.duration) || 0),
    max_combo: Math.floor(Number(body.maxCombo) || 0),
    p1_total_damage: Math.floor(Number(body.p1TotalDamage) || 0),
    p2_total_damage: Math.floor(Number(body.p2TotalDamage) || 0),
    p1_total_hits: Math.floor(Number(body.p1TotalHits) || 0),
    p2_total_hits: Math.floor(Number(body.p2TotalHits) || 0),
    p1_final_hp: Number(body.p1FinalHp) || 0,
    p2_final_hp: Number(body.p2FinalHp) || 0,
    disconnected: !!body.disconnected,
  };

  var insertRes = await sb('match_reports', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(reportRow),
  });
  if (!insertRes.ok) {
    console.error('match-report insert error:', await insertRes.text());
    return res.status(500).json({ error: 'Failed to save report' });
  }

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

  if (r1.winner_username !== r2.winner_username) {
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

// POST without reporter → legacy simple finish (backwards compat)
async function handleLegacyFinish(body, res) {
  var matchId = body.matchId;
  var winnerUsername = body.winnerUsername;

  if (!matchId || !winnerUsername) {
    return res.status(400).json({ error: 'matchId and winnerUsername are required' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) {
    return res.status(400).json({ error: 'Invalid matchId format' });
  }

  var matchRes = await sb('matches?id=eq.' + matchId + '&select=player1_username,player2_username,status&limit=1');
  var matches = await matchRes.json();
  var match = Array.isArray(matches) ? matches[0] : null;

  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.status === 'finished') return res.status(409).json({ error: 'Match already finished' });
  if (winnerUsername !== match.player1_username && winnerUsername !== match.player2_username) {
    return res.status(403).json({ error: 'Winner is not a match participant' });
  }

  var updateRes = await sb('matches?id=eq.' + matchId + '&status=in.(active,pending)', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'finished', winner_username: winnerUsername, updated_at: new Date().toISOString() }),
  });

  if (!updateRes.ok) {
    console.error('match-finish error:', await updateRes.text());
    return res.status(500).json({ error: 'Failed to finish match' });
  }

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(function(entry) { res.setHeader(entry[0], entry[1]); });
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // GET → match verification status
  if (req.method === 'GET') return handleGetStatus(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // POST with reporter → dual-client match report
  if (body && body.reporter) return handleMatchReport(body, res);

  // POST without reporter → legacy simple finish
  return handleLegacyFinish(body || {}, res);
}
