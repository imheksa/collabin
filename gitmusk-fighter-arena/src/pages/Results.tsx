import { useEffect, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useGameStore } from '../stores/gameStore';
import { Fighter } from '../types';
import { recordMatch, getProfile, getLevelTier, getMmrTier, ACHIEVEMENT_RARITY_COLORS } from '../utils/playerProfile';
import { syncProfile, fetchSeasonInfo } from '../utils/cloudSync';
import { supabase } from '../lib/supabase';

const GAME_URL = typeof window !== 'undefined' ? window.location.origin : 'https://exarena.xyz';

async function resolveAvatarBlobUrl(avatarUrl: string, username: string): Promise<string> {
  const fallback = `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(username)}&size=80`;
  try {
    if (avatarUrl) {
      const fetchUrl = avatarUrl.startsWith('https://pbs.twimg.com')
        ? avatarUrl.replace('https://pbs.twimg.com', '/img-proxy')
        : avatarUrl;
      const resp = await fetch(fetchUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
      }
    }
  } catch { /* fall through */ }
  try {
    const resp = await fetch(fallback);
    if (resp.ok) {
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    }
  } catch { /* use URL directly */ }
  return fallback;
}

function FighterCard({ fighter, opponent, isWinner, avatarSrc }: { fighter: Fighter; opponent: Fighter; isWinner: boolean; avatarSrc?: string }) {
  const STATS = [
    { label: 'PWR',  val: fighter.stats.basePower, oppVal: opponent.stats.basePower, color: '#ff2d75', max: 100 },
    { label: 'DEF',  val: fighter.stats.defense,   oppVal: opponent.stats.defense,   color: '#00e5ff', max: 100 },
    { label: 'SPD',  val: fighter.stats.speed,      oppVal: opponent.stats.speed,     color: '#00ff9d', max: 100 },
    { label: 'CRIT', val: fighter.stats.critRate,   oppVal: opponent.stats.critRate,  color: '#ffd60a', max: 80  },
  ];
  const borderColor = isWinner ? 'var(--neon-grn)' : 'var(--neon-pink)';
  const glow = isWinner ? 'rgba(0,255,157,.22)' : 'rgba(255,45,117,.16)';
  const fallback = `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(fighter.profile.username)}&size=80`;
  const imgSrc = avatarSrc || fighter.profile.avatarUrl || fallback;
  return (
    <div style={{ background: 'var(--void-2)', border: `3px solid ${borderColor}`, boxShadow: `0 0 18px ${glow}`, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, opacity: isWinner ? 1 : 0.85 }}>
      {/* Name + Archetype at top */}
      <div style={{ textAlign: 'center', width: '100%', marginBottom: '10px' }}>
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
          @{fighter.profile.username}
        </div>
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: fighter.stats.color, letterSpacing: '.05em' }}>
          {fighter.stats.archetypeLabel.toUpperCase()}
        </div>
      </div>
      {/* Profile photo */}
      <div style={{ width: '58px', height: '58px', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${fighter.stats.color}`, marginBottom: '6px', background: fighter.stats.color + '40', flexShrink: 0 }}>
        <img
          src={imgSrc}
          crossOrigin="anonymous"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
          alt={fighter.profile.username}
        />
      </div>
      {/* Win/loss badge */}
      <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: borderColor, textShadow: `0 0 8px ${borderColor}`, marginBottom: '10px', letterSpacing: '.05em' }}>
        {isWinner ? '🏆 WINNER' : '💀 LOSER'}
      </div>
      {/* Stats with +/- match result bars */}
      <div style={{ width: '100%' }}>
        {STATS.map(({ label, val, oppVal, color, max }) => {
          const better = val >= oppVal;
          return (
            <div key={label} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--txt-dim)', width: '26px', flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: '6px', background: 'var(--void)', border: '1px solid var(--panel-line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(val / max) * 100}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
                </div>
                <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: better ? 'var(--neon-grn)' : 'var(--neon-pink)', width: '10px', textAlign: 'center', flexShrink: 0, textShadow: `0 0 6px ${better ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>
                  {better ? '+' : '−'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildTweetText(me: Fighter, opponent: Fighter, isWin: boolean, maxCombo: number, duration: number) {
  return isWin
    ? `⚔️ Just defeated @${opponent.profile.username} in #ExArena!\n\n🏆 ${me.stats.archetypeLabel} | Power: ${me.stats.basePower}\n💥 Max combo: ${maxCombo}x | ⏱ ${duration}s\n\nThink you can beat me? 🎮\n${GAME_URL}`
    : `💀 Just got rekt by @${opponent.profile.username} in #ExArena!\n\nMy fighter: ${me.stats.archetypeLabel} | Power: ${me.stats.basePower}\nRematch time! 🎮\n${GAME_URL}`;
}

export function Results() {
  const { matchResult, resetMatch, rematch, setScreen, player1, player2, lastMatchReward, setLastMatchReward, setPlayerProfile, matchId, setPlayer2, setMatchId, setIsHost, setMatchMode, setMatchResult } = useGameStore();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareImgUrl, setShareImgUrl] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [avatarSrcs, setAvatarSrcs] = useState<Record<string, string>>({});
  const fighterPanelRef = useRef<HTMLDivElement>(null);

  // Rematch state
  const [rematchOffer, setRematchOffer] = useState<string | null>(null);
  const [waitingRematch, setWaitingRematch] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const rematchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const rematchWatchRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to rematch broadcast when this was a P2P match
  useEffect(() => {
    if (!matchId || !player1) return;
    const ch = supabase.channel(`rematch:${matchId}`)
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload?.newMatchId && !waitingRematch) setRematchOffer(payload.newMatchId);
      })
      .subscribe();
    rematchChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  const requestRematch = useCallback(async () => {
    if (!player1 || !matchId) return;
    setRematchLoading(true);
    try {
      const res = await fetch('/api/room-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: player1.profile.username, fighterData: { profile: player1.profile, stats: player1.stats } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Notify opponent
      await rematchChannelRef.current?.send({ type: 'broadcast', event: 'offer', payload: { newMatchId: data.matchId } });
      setWaitingRematch(true);

      // Watch for opponent joining the new room
      const ch = supabase.channel(`room_watch:${data.matchId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${data.matchId}` },
          (payload) => {
            if (payload.new.status === 'active' && payload.new.player2_data) {
              setPlayer2(payload.new.player2_data as Fighter);
              setMatchId(data.matchId);
              setIsHost(true);
              setMatchMode('friend');
              rematch();
              setScreen('vs_screen');
              supabase.removeChannel(ch);
            }
          })
        .subscribe();
      rematchWatchRef.current = ch;

      // Timeout after 60s
      setTimeout(() => { setWaitingRematch(false); supabase.removeChannel(ch); }, 60000);
    } catch (err) {
      console.error('Rematch request error:', err);
    } finally {
      setRematchLoading(false);
    }
  }, [player1, matchId]);

  const acceptRematch = useCallback(async () => {
    if (!rematchOffer || !player1) return;
    setRematchLoading(true);
    try {
      const res = await fetch('/api/room-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: rematchOffer, username: player1.profile.username, fighterData: { profile: player1.profile, stats: player1.stats } }),
      });
      if (!res.ok) throw new Error('Join failed');
      const data = await res.json();
      setPlayer2(data.player1Data as Fighter);
      setMatchId(rematchOffer);
      setIsHost(false);
      setMatchMode('friend');
      rematch();
      setScreen('vs_screen');
    } catch (err) {
      console.error('Accept rematch error:', err);
      setRematchOffer(null);
    } finally {
      setRematchLoading(false);
    }
  }, [rematchOffer, player1]);

  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!matchResult || !player1 || !player2) return;
    (async () => {
      const seasonInfo = await fetchSeasonInfo();
      const isP1Win = matchResult.winner.profile.username === player1.profile.username;
      const isPvP = !!matchId;
      const opponentMmr = getProfile(player2.profile.username).mmr;
      const reward = recordMatch(
        player1.profile.username, isP1Win, matchResult.maxCombo, matchResult.duration,
        { username: player2.profile.username, archetype: player2.stats.archetype },
        isPvP,
        seasonInfo.season,
        opponentMmr,
      );
      setLastMatchReward(reward);
      const updated = getProfile(player1.profile.username);
      setPlayerProfile(updated);
      if (!player1.profile.isDemo) syncProfile(updated, player1).catch(() => {});
      if (isPvP) {
        fetch('/api/match-finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, winnerUsername: matchResult.winner.profile.username }),
        }).catch(() => {});
      }
    })();
  }, []);

  // Pre-load both avatars as blob URLs so html2canvas can capture them without CORS issues
  useEffect(() => {
    if (!player1 || !player2) return;
    let revoked = false;
    const prevUrls: string[] = [];
    (async () => {
      const [src1, src2] = await Promise.all([
        resolveAvatarBlobUrl(player1.profile.avatarUrl, player1.profile.username),
        resolveAvatarBlobUrl(player2.profile.avatarUrl, player2.profile.username),
      ]);
      if (revoked) {
        if (src1.startsWith('blob:')) URL.revokeObjectURL(src1);
        if (src2.startsWith('blob:')) URL.revokeObjectURL(src2);
        return;
      }
      prevUrls.push(src1, src2);
      setAvatarSrcs({
        [player1.profile.username]: src1,
        [player2.profile.username]: src2,
      });
    })();
    return () => {
      revoked = true;
      prevUrls.forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u); });
    };
  }, [player1?.profile.username, player2?.profile.username]);

  const generateShareCard = useCallback(async () => {
    if (!fighterPanelRef.current) return;
    setGeneratingCard(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(fighterPanelRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        logging: false,
        backgroundColor: '#0a0118',
      });
      setShareImgUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('html2canvas error:', err);
    } finally {
      setGeneratingCard(false);
    }
  }, []);

  // Auto-generate share card once panel is visible and avatars are loaded
  useEffect(() => {
    if (!show || Object.keys(avatarSrcs).length < 2) return;
    // Delay to allow images to render in DOM
    const t = setTimeout(() => generateShareCard(), 400);
    return () => clearTimeout(t);
  }, [show, avatarSrcs, generateShareCard]);

  // Revoke shareImgUrl on unmount (it's a data URL so no-op, but good habit)
  useEffect(() => () => { setShareImgUrl(null); }, []);

  const downloadCard = useCallback(() => {
    if (!shareImgUrl) return;
    const a = document.createElement('a');
    a.download = 'x-fighter-result.png';
    a.href = shareImgUrl;
    a.click();
  }, [shareImgUrl]);

  if (!matchResult || !player1 || !player2) return null;

  const { winner, rounds, duration, maxCombo } = matchResult;
  const isP1Win = winner.profile.username === player1.profile.username;
  const tweetText = buildTweetText(player1, player2, isP1Win, maxCombo, duration);

  const shareWithCard = useCallback(async () => {
    if (!shareImgUrl) return;
    const res = await fetch(shareImgUrl);
    const blob = await res.blob();
    const file = new File([blob], 'fighter-result.png', { type: 'image/png' });

    // Mobile: native share sheet
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: '⚔ Ex Arena', text: tweetText, files: [file] });
        return;
      } catch { /* user dismissed */ }
    }

    // Desktop fallback: save card then open Twitter compose
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = 'fighter-result.png'; a.href = url; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'noopener,noreferrer');
    }, 600);
  }, [shareImgUrl, tweetText]);

  const copyText = async () => { await navigator.clipboard.writeText(tweetText).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="gscreen flex flex-col items-center p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl">

        {/* Nav */}
        <nav className="g-nav" style={{ position: 'relative', marginBottom: '28px' }}>
          <div className="logo"><div className="badge">X</div>FIGHTER ARENA</div>
          <button onClick={() => setScreen('landing')} className="g-btn ghost sm">← MENU</button>
        </nav>

        {/* Result header */}
        <div className="text-center mb-6 transition-all duration-500"
          style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-20px)' }}>
          <span className="g-eyebrow" style={{ color: isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)' }}>
            // BATTLE RESULTS
          </span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '28px', color: winner.stats.color, textShadow: `3px 3px 0 ${isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>
            {winner.profile.username.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '18px', color: isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)', marginTop: '8px', textShadow: `0 0 20px ${isP1Win ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>
            {isP1Win ? '🏆 VICTORY!' : '💀 DEFEATED'}
          </div>
          {matchResult.disconnected && (
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: '#ff8800', marginTop: '10px', letterSpacing: '.1em', textShadow: '0 0 10px #ff8800' }}>
              ⚠ OPPONENT DISCONNECTED — YOU WIN!
            </div>
          )}
        </div>

        {/* Fighter comparison panel — this is captured directly as the share card */}
        <div ref={fighterPanelRef} className="mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .5s .08s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'start' }}>
            <FighterCard fighter={player1} opponent={player2} isWinner={isP1Win} avatarSrc={avatarSrcs[player1.profile.username]} />
            <div style={{ display: 'flex', alignItems: 'center', padding: '54px 6px 0', fontFamily: 'var(--pixel)', fontSize: '13px', color: 'var(--neon-yel)', textShadow: '2px 2px 0 var(--neon-pink)' }}>
              VS
            </div>
            <FighterCard fighter={player2} opponent={player1} isWinner={!isP1Win} avatarSrc={avatarSrcs[player2.profile.username]} />
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex gap-3 mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .15s' }}>
          {[
            { label: 'ROUNDS', val: String(rounds), color: 'var(--neon-b)' },
            { label: 'DURATION', val: `${duration}s`, color: 'var(--neon-yel)' },
            { label: 'MAX COMBO', val: `${maxCombo}x`, color: 'var(--neon-pink)' },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center py-4"
              style={{ background: 'var(--void-2)', border: `3px solid ${s.color}40` }}>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '16px', color: s.color, textShadow: `0 0 12px ${s.color}` }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* XP Reward panel */}
        {lastMatchReward && (
          <div className={`g-panel mb-5 ${lastMatchReward.leveledUp ? 'yel' : ''}`}
            style={{ padding: '20px', opacity: show ? 1 : 0, transition: 'opacity .6s .25s' }}>
            <div className="corners"><i></i><i></i><i></i><i></i></div>
            {lastMatchReward.leveledUp ? (
              <div className="text-center mb-3">
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '18px', color: 'var(--neon-yel)', textShadow: '0 0 20px var(--neon-yel)', animation: 'g-pulse 1s steps(2) infinite' }}>
                  ⬆ LEVEL UP!
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: '#fff', marginTop: '8px' }}>
                  {getLevelTier(lastMatchReward.oldLevel).name} → {getLevelTier(lastMatchReward.newLevel).name} LV{lastMatchReward.newLevel}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-p)', textAlign: 'center', marginBottom: '12px', letterSpacing: '.2em' }}>
                XP EARNED
              </div>
            )}
            <div className="text-center mb-3">
              <span style={{ fontFamily: 'var(--pixel)', fontSize: '22px', color: 'var(--neon-grn)', textShadow: '0 0 12px var(--neon-grn)' }}>
                +{lastMatchReward.xpGained} XP
              </span>
            </div>
            {lastMatchReward.newAchievements.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', textAlign: 'center', marginBottom: '8px' }}>ACHIEVEMENTS UNLOCKED</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {lastMatchReward.newAchievements.map(ach => (
                    <div key={ach.id} className="flex items-center gap-1.5 px-2 py-1"
                      style={{ background: `${ACHIEVEMENT_RARITY_COLORS[ach.rarity]}18`, border: `2px solid ${ACHIEVEMENT_RARITY_COLORS[ach.rarity]}` }}>
                      <span>{ach.icon}</span>
                      <span style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: ACHIEVEMENT_RARITY_COLORS[ach.rarity] }}>{ach.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MMR Rating panel */}
        {lastMatchReward && (
          <div className="g-panel mb-5" style={{ padding: '16px 20px', opacity: show ? 1 : 0, transition: 'opacity .6s .3s' }}>
            <div className="corners"><i></i><i></i><i></i><i></i></div>
            {(() => {
              const { mmrDelta, newMmr } = lastMatchReward;
              const oldMmr = newMmr - mmrDelta;
              const tier = getMmrTier(newMmr);
              const positive = mmrDelta >= 0;
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', marginBottom: '8px', letterSpacing: '.15em' }}>
                      MMR RATING
                    </div>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '12px', color: tier.color }}>
                      {tier.icon} {tier.name}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)', marginTop: '4px' }}>
                      {oldMmr} → {newMmr} MMR
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '26px', color: positive ? 'var(--neon-grn)' : 'var(--neon-pink)', textShadow: `0 0 12px ${positive ? 'var(--neon-grn)' : 'var(--neon-pink)'}` }}>
                      {positive ? '+' : ''}{mmrDelta}
                    </div>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: positive ? 'var(--neon-grn)' : 'var(--neon-pink)' }}>
                      MMR {positive ? '▲' : '▼'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Share card — html2canvas snapshot of the fighter comparison panel above */}
        <div className="mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .35s' }}>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-b)', textAlign: 'center', marginBottom: '10px', letterSpacing: '.15em' }}>
            // SHARE CARD
          </div>
          <div style={{ position: 'relative', border: '4px solid var(--neon-p)', boxShadow: '0 0 24px rgba(176,38,255,.4)', minHeight: shareImgUrl ? undefined : '160px', background: 'var(--void-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {shareImgUrl ? (
              <img src={shareImgUrl} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Share card" />
            ) : (
              <div className="flex gap-2">
                {[0,1,2].map(i => <div key={i} className="w-3 h-3 animate-bounce" style={{ background: 'var(--neon-p)', animationDelay: `${i*.15}s` }} />)}
              </div>
            )}
            {generatingCard && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--void-2)' }}>
                <div className="flex gap-2">
                  {[0,1,2].map(i => <div key={i} className="w-3 h-3 animate-bounce" style={{ background: 'var(--neon-p)', animationDelay: `${i*.15}s` }} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share actions */}
        <div className="mb-5" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .4s' }}>
          <div className="p-3 mb-3" style={{ background: 'var(--void-2)', border: '3px solid var(--panel-line)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--txt-dim)', lineHeight: '1.7' }}>
              {tweetText.split('\n').map((line, i) => <div key={i}>{line || ' '}</div>)}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCard} disabled={!shareImgUrl} className="g-btn ghost sm" style={{ color: player1.stats.color, borderColor: player1.stats.color, boxShadow: 'none', fontSize: '8px' }}>
              📥 SAVE
            </button>
            <button onClick={shareWithCard} disabled={!shareImgUrl} className="g-btn flex-1 sm" style={{ background: '#1d9bf0', fontSize: '9px', gap: '8px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              SHARE ON X
            </button>
            <button onClick={copyText} className="g-btn ghost sm" style={{ fontSize: '9px', color: copied ? 'var(--neon-grn)' : undefined }}>
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* P2E upsell */}
        <div className="g-panel mb-5 text-center" style={{ padding: '16px', opacity: show ? 1 : 0, transition: 'opacity .6s .45s' }}>
          <div className="corners"><i></i><i></i><i></i><i></i></div>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-yel)', marginBottom: '6px' }}>💰 UPGRADE TO P2E MODE</div>
          <div style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)' }}>
            This match was worth $0. In P2E mode, winner takes ~$1.995 from a $2 pool (0.25% fee).
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3" style={{ opacity: show ? 1 : 0, transition: 'opacity .6s .5s' }}>

          {/* P2P rematch offer received */}
          {rematchOffer && !waitingRematch && (
            <div className="g-panel" style={{ padding: '14px 16px', borderColor: '#00ccff', boxShadow: '0 0 16px rgba(0,204,255,.3)', textAlign: 'center' }}>
              <div className="corners"><i></i><i></i><i></i><i></i></div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: '#00ccff', marginBottom: '10px' }}>⚔ REMATCH REQUESTED!</div>
              <div className="flex gap-2 justify-center">
                <button onClick={acceptRematch} disabled={rematchLoading} className="g-btn sm" style={{ background: '#00ccff', color: '#000', fontSize: '9px' }}>
                  {rematchLoading ? '...' : 'ACCEPT'}
                </button>
                <button onClick={() => setRematchOffer(null)} className="g-btn ghost sm" style={{ fontSize: '9px' }}>DECLINE</button>
              </div>
            </div>
          )}

          {/* Waiting for opponent to accept */}
          {waitingRematch && (
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)', textAlign: 'center', animation: 'g-pulse 1s steps(2) infinite' }}>
              WAITING FOR OPPONENT...
            </div>
          )}

          <div className="flex gap-3 flex-wrap justify-center">
            {/* AI rematch */}
            {!matchId && (
              <button onClick={() => { rematch(); setScreen('vs_screen'); }} className="g-btn ghost sm" style={{ color: 'var(--neon-b)' }}>
                ▶ REMATCH
              </button>
            )}
            {/* P2P rematch request */}
            {matchId && !rematchOffer && !waitingRematch && (
              <button onClick={requestRematch} disabled={rematchLoading} className="g-btn ghost sm" style={{ color: '#00ccff', borderColor: '#00ccff' }}>
                {rematchLoading ? '...' : '⚔ REMATCH'}
              </button>
            )}
            <button onClick={() => setScreen('leaderboard')} className="g-btn sm">🏆 LEADERBOARD</button>
            <button onClick={() => setScreen('profile')} className="g-btn ghost sm" style={{ color: 'var(--neon-p)' }}>👤 PROFILE</button>
          </div>
        </div>
      </div>
    </div>
  );
}
