import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { Fighter } from '../types';
import { connectBankrKey, checkBankrExists, lookupBankrUser } from '../utils/bankrClient';
import { getWalletBalance } from '../utils/baseRpc';
import { getProfile, getLevelTier, xpProgressInLevel } from '../utils/playerProfile';

const P2E_MIN_USD = 1;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'GMF-' + Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/* ─── P2E Modal ─────────────────────────────────────────────────── */

type P2eStep = 'checking' | 'eligible' | 'insufficient' | 'not_connected' | 'manual_fallback';
interface BalanceSnapshot { address: string; usdc: number; eth: number; ethPriceUsd: number; totalUsd: number; }

function P2eModal({ username, onClose, onReady }: { username: string; onClose: () => void; onReady: () => void }) {
  const { setWalletAddress } = useGameStore();
  const [step, setStep] = useState<P2eStep>('checking');
  const [balance, setBalance] = useState<BalanceSnapshot | null>(null);
  const [bankrKey, setBankrKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const runAutoCheck = useCallback(async () => {
    setStep('checking'); setBalance(null);
    try {
      const addr = await lookupBankrUser(username);
      if (!addr) { setStep('not_connected'); return; }
      const bal = await getWalletBalance(addr);
      setWalletAddress(addr);
      setBalance({ address: addr, ...bal });
      setStep(bal.totalUsd >= P2E_MIN_USD ? 'eligible' : 'insufficient');
    } catch { setStep('manual_fallback'); }
  }, [username, setWalletAddress]);

  useEffect(() => { runAutoCheck(); }, [runAutoCheck]);

  const connectWithKey = async () => {
    const key = bankrKey.trim(); if (!key) return;
    setKeyLoading(true); setErrMsg('');
    try {
      const data = await connectBankrKey(key, username);
      const bal = await getWalletBalance(data.evmAddress);
      setWalletAddress(data.evmAddress);
      setBalance({ address: data.evmAddress, ...bal });
      setStep(bal.totalUsd >= P2E_MIN_USD ? 'eligible' : 'insufficient');
    } catch (err) { setErrMsg(err instanceof Error ? err.message : 'Connection failed.'); }
    finally { setKeyLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,1,24,.88)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="g-panel yel w-full max-w-md" style={{ padding: '28px' }}>
        <div className="corners"><i></i><i></i><i></i><i></i></div>
        <button onClick={onClose}
          className="absolute top-4 right-4"
          style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--txt-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>

        <div className="text-center mb-6">
          <span className="g-eyebrow" style={{ color: 'var(--neon-yel)' }}>// PLAY-TO-EARN</span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '18px', color: 'var(--neon-yel)', textShadow: '3px 3px 0 var(--neon-pink)' }}>
            PLAY. FIGHT. EARN.
          </div>
          <div style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)', marginTop: '8px' }}>
            Minimum ${P2E_MIN_USD} via Bankr · 99.75% to winner
          </div>
        </div>

        {step === 'checking' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex gap-2">
              {[0,1,2].map(i => <div key={i} className="w-3 h-3 animate-bounce" style={{ background: 'var(--neon-yel)', animationDelay: `${i*.15}s` }} />)}
            </div>
            <div style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)' }}>Linking @{username}'s X account with Bankr...</div>
          </div>
        )}

        {(step === 'eligible' || step === 'insufficient') && balance && (
          <div>
            <div className="flex gap-2 mb-4">
              {[
                { label: 'USDC', val: `$${balance.usdc.toFixed(2)}`, color: 'var(--neon-grn)' },
                { label: 'ETH',  val: balance.eth.toFixed(4),         color: 'var(--neon-b)' },
                { label: 'TOTAL', val: `$${balance.totalUsd.toFixed(2)}`, color: step === 'eligible' ? 'var(--neon-grn)' : 'var(--neon-pink)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex-1 text-center py-3" style={{ background: 'var(--void)', border: `3px solid ${color}40` }}>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color, marginBottom: '6px' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '12px', color: '#fff' }}>{val}</div>
                </div>
              ))}
            </div>
            {step === 'eligible' ? (
              <>
                <div className="text-center py-3 mb-4" style={{ background: 'rgba(0,255,157,.08)', border: '3px solid var(--neon-grn)' }}>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-grn)' }}>✓ READY — $1 STAKE</div>
                </div>
                <button onClick={onReady} className="g-btn full" style={{ fontSize: '11px' }}>⚔ ENTER P2E MATCH</button>
              </>
            ) : (
              <>
                <div className="text-center py-3 mb-4" style={{ background: 'rgba(255,45,117,.08)', border: '3px solid var(--neon-pink)' }}>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-pink)' }}>
                    NEED ${(P2E_MIN_USD - balance.totalUsd).toFixed(2)} MORE IN BANKR
                  </div>
                </div>
                <button onClick={runAutoCheck} className="g-btn ghost full sm">🔄 RECHECK BALANCE</button>
              </>
            )}
          </div>
        )}

        {step === 'not_connected' && (
          <div>
            <div className="g-panel dark text-center mb-4" style={{ padding: '20px' }}>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-yel)', marginBottom: '8px' }}>X NOT LINKED TO BANKR</div>
              <div style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)' }}>Sign in at bankr.bot with your X account, then add $5+ to play</div>
            </div>
            <div className="flex gap-2">
              <a href="https://bankr.bot/terminal" target="_blank" rel="noopener" className="g-btn sm flex-1" style={{ textDecoration: 'none', justifyContent: 'center' }}>🌐 BANKR.BOT</a>
              <button onClick={runAutoCheck} className="g-btn ghost sm flex-1">🔄 TRY AGAIN</button>
            </div>
          </div>
        )}

        {step === 'manual_fallback' && (
          <div>
            <div className="g-panel pink text-center mb-4" style={{ padding: '16px' }}>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-pink)' }}>AUTO-CHECK UNAVAILABLE</div>
              <div style={{ fontFamily: 'var(--body)', fontSize: '16px', color: 'var(--txt-dim)', marginTop: '4px' }}>DM @bankrbot: "my api key"</div>
            </div>
            <div className="flex gap-2 mb-2">
              <input style={{ flex: 1, background: 'var(--void)', border: '3px solid var(--panel-line)', fontFamily: 'var(--mono)', fontSize: '13px', color: '#fff', padding: '10px 14px', outline: 'none' }}
                placeholder="bk_xxxxxxxxxxxxxxxx" type="password" value={bankrKey}
                onChange={e => setBankrKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && connectWithKey()} autoFocus />
              <button onClick={connectWithKey} disabled={keyLoading} className="g-btn sm">{keyLoading ? '...' : 'GO'}</button>
            </div>
            {errMsg && <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--neon-pink)', marginTop: '8px' }}>⚠ {errMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ModeSelect ─────────────────────────────────────────────────── */

export function ModeSelect() {
  const { player1, setPlayer2, setScreen, setMode, setMatchMode, onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches, roomCode, setRoomCode, walletAddress } = useGameStore();
  const [tab, setTab] = useState<'random' | 'friend'>('random');
  const [friendTab, setFriendTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [waitingFriend, setWaitingFriend] = useState(false);
  const [searchDots, setSearchDots] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showP2eModal, setShowP2eModal] = useState(false);
  const [bankrExists, setBankrExists] = useState<boolean | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setOnlinePlayers(onlinePlayers + Math.floor((Math.random() - .4) * 5));
      setActiveMatches(Math.max(5, activeMatches + Math.floor((Math.random() - .4) * 3)));
    }, 3000);
    return () => clearInterval(iv);
  }, [onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches]);

  useEffect(() => {
    if (!searching && !waitingFriend) return;
    const iv = setInterval(() => setSearchDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(iv);
  }, [searching, waitingFriend]);

  useEffect(() => {
    if (!player1) return;
    checkBankrExists(player1.profile.username).then(setBankrExists);
  }, [player1]);

  const pickRandomOpponent = useCallback(() => {
    const others = DEMO_PROFILES.filter(p => p.username !== player1?.profile.username);
    const picked = others[Math.floor(Math.random() * others.length)];
    setPlayer2({ profile: picked, stats: calculateFighterStats(picked) } as Fighter);
    setMatchMode('random');
    setScreen('vs_screen');
  }, [player1, setPlayer2, setMatchMode, setScreen]);

  const startRandomSearch = () => {
    setSearching(true);
    const delay = 1500 + Math.random() * 2000;
    setCountdown(Math.ceil(delay / 1000));
    const cd = setInterval(() => setCountdown(c => c - 1), 1000);
    setTimeout(() => { clearInterval(cd); setSearching(false); pickRandomOpponent(); }, delay);
  };

  const createRoom = () => {
    setRoomCode(generateRoomCode());
    setWaitingFriend(true);
    setTimeout(() => { setWaitingFriend(false); pickRandomOpponent(); setMatchMode('friend'); }, 4000 + Math.random() * 4000);
  };

  const joinRoom = () => {
    if (joinCode.trim().length < 3) return;
    setWaitingFriend(true);
    setTimeout(() => { setWaitingFriend(false); pickRandomOpponent(); setMatchMode('friend'); }, 2000);
  };

  if (!player1) return null;

  const p1Profile = getProfile(player1.profile.username);
  const p1Tier = getLevelTier(p1Profile.level);
  const p1XpPct = xpProgressInLevel(p1Profile.xp, p1Profile.level);

  return (
    <div className="gscreen flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">

        {/* Nav */}
        <nav className="g-nav" style={{ marginBottom: '28px', position: 'relative' }}>
          <div className="logo">
            <div className="badge">X</div>
            FIGHTER ARENA
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="g-dot"></span>
              <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-grn)' }}>{onlinePlayers.toLocaleString()} ONLINE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="g-dot" style={{ background: 'var(--neon-pink)', animationDelay: '.5s' }}></span>
              <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-pink)' }}>{activeMatches} IN BATTLE</span>
            </div>
          </div>
        </nav>

        {/* Fighter status header */}
        <div className="g-panel blue mb-6" style={{ padding: '16px' }}>
          <div className="corners"><i></i><i></i><i></i><i></i></div>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-b)', marginBottom: '12px', letterSpacing: '.2em' }}>// FIGHTER SELECTED</div>
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 overflow-hidden" style={{ border: `3px solid ${p1Tier.color}` }}>
                <img src={player1.profile.avatarUrl} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player1.profile.username}`; }} />
              </div>
              <div className="absolute -bottom-1 -right-1 px-1"
                style={{ background: p1Tier.color, color: 'var(--void)', fontFamily: 'var(--pixel)', fontSize: '6px' }}>
                LV{p1Profile.level}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: '#fff' }}>@{player1.profile.username}</span>
                <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: p1Tier.color }}>{p1Tier.name}</span>
                {bankrExists && <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--neon-yel)' }}>● BANKR</span>}
                {walletAddress && <span style={{ fontFamily: 'var(--pixel)', fontSize: '6px', color: 'var(--neon-grn)' }}>● BANKR</span>}
              </div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: player1.stats.color, marginBottom: '6px' }}>
                {player1.stats.archetypeLabel.toUpperCase()}
              </div>
              <div style={{ height: '8px', background: 'var(--void)', border: '2px solid var(--panel-line)' }}>
                <div style={{ height: '100%', width: `${p1XpPct * 100}%`, background: p1Tier.color, transition: 'width 1s' }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '11px', color: 'var(--neon-yel)' }}>PWR {player1.stats.basePower}</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)', marginTop: '4px' }}>
                {p1Profile.wins}W {p1Profile.losses}L
              </div>
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-4" style={{ border: '3px solid var(--panel-line)' }}>
          {(['random', 'friend'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearching(false); setWaitingFriend(false); }}
              className="flex-1 py-3"
              style={{
                fontFamily: 'var(--pixel)', fontSize: '9px', border: 'none', cursor: 'pointer',
                background: tab === t ? (t === 'random' ? 'rgba(0,229,255,.15)' : 'rgba(255,45,117,.15)') : 'var(--void-2)',
                color: tab === t ? (t === 'random' ? 'var(--neon-b)' : 'var(--neon-pink)') : 'var(--txt-dim)',
                borderBottom: tab === t ? `4px solid ${t === 'random' ? 'var(--neon-b)' : 'var(--neon-pink)'}` : '4px solid transparent',
              }}>
              {t === 'random' ? '🎲 RANDOM MATCH' : '👥 FRIEND PLAY'}
            </button>
          ))}
        </div>

        {/* Random Match */}
        {tab === 'random' && (
          <div className="g-panel" style={{ padding: '24px' }}>
            <div className="corners"><i></i><i></i><i></i><i></i></div>
            {!searching ? (
              <div className="text-center">
                <span className="g-eyebrow">// RANDOM MATCHMAKING</span>
                <p style={{ fontFamily: 'var(--body)', fontSize: '20px', color: 'var(--txt-dim)', marginBottom: '24px', maxWidth: '36ch', margin: '0 auto 24px' }}>
                  Get matched with a random fighter. Ranked by Twitter Score.
                </p>
                {/* Opponent avatars preview */}
                <div className="flex justify-center gap-2 mb-6">
                  {DEMO_PROFILES.filter(p => p.username !== player1.profile.username).slice(0, 4).map(p => (
                    <div key={p.username} className="w-9 h-9 overflow-hidden" style={{ border: '2px solid var(--panel-line)', opacity: .7 }}>
                      <img src={p.avatarUrl} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.username}`; }} />
                    </div>
                  ))}
                  <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'var(--void)', border: '2px solid var(--panel-line)', fontFamily: 'var(--pixel)', fontSize: '7px', color: 'var(--txt-dim)' }}>
                    +{onlinePlayers - 4}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { setMode('free'); startRandomSearch(); }} className="g-btn ghost full" style={{ fontSize: '11px' }}>
                    ▶ FREE MATCH
                  </button>
                  <button onClick={() => setShowP2eModal(true)} className="g-btn full" style={{ fontSize: '11px' }}>
                    💰 P2E MATCH — $1 STAKE
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full animate-spin"
                    style={{ border: '3px solid transparent', borderTopColor: 'var(--neon-b)', borderRightColor: 'rgba(0,229,255,.3)' }} />
                  <div className="absolute inset-3 rounded-full animate-spin"
                    style={{ border: '3px solid transparent', borderTopColor: 'var(--neon-pink)', animationDirection: 'reverse', animationDuration: '.8s' }} />
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ fontFamily: 'var(--pixel)', fontSize: '11px', color: 'var(--neon-b)' }}>
                    {countdown > 0 ? countdown : '!'}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '11px', color: '#fff', marginBottom: '8px' }}>SEARCHING{searchDots}</div>
                <div style={{ fontFamily: 'var(--body)', fontSize: '20px', color: 'var(--txt-dim)', marginBottom: '24px' }}>
                  Scanning {onlinePlayers} fighters...
                </div>
                <button onClick={() => setSearching(false)} className="g-btn ghost sm">✕ CANCEL</button>
              </div>
            )}
          </div>
        )}

        {/* Friend Play */}
        {tab === 'friend' && (
          <div className="g-panel pink" style={{ padding: '0' }}>
            <div className="corners"><i></i><i></i><i></i><i></i></div>
            <div className="flex" style={{ borderBottom: '4px solid var(--neon-pink)' }}>
              {(['create', 'join'] as const).map(ft => (
                <button key={ft} onClick={() => { setFriendTab(ft); setWaitingFriend(false); setRoomCode(''); }}
                  className="flex-1 py-3"
                  style={{
                    fontFamily: 'var(--pixel)', fontSize: '8px', border: 'none', cursor: 'pointer',
                    background: friendTab === ft ? 'rgba(255,45,117,.2)' : 'var(--void-2)',
                    color: friendTab === ft ? 'var(--neon-pink)' : 'var(--txt-dim)',
                    borderBottom: friendTab === ft ? '4px solid var(--neon-pink)' : '4px solid transparent',
                  }}>
                  {ft === 'create' ? '➕ CREATE ROOM' : '🔑 JOIN ROOM'}
                </button>
              ))}
            </div>
            <div className="text-center p-6">
              {friendTab === 'create' && !waitingFriend && (
                <>
                  <span className="g-eyebrow" style={{ color: 'var(--neon-pink)' }}>// CREATE A ROOM</span>
                  <p style={{ fontFamily: 'var(--body)', fontSize: '20px', color: 'var(--txt-dim)', marginBottom: '24px' }}>
                    Generate a code and share with your friend.
                  </p>
                  <button onClick={createRoom} className="g-btn pink full" style={{ fontSize: '11px' }}>➕ GENERATE ROOM CODE</button>
                </>
              )}
              {friendTab === 'create' && waitingFriend && roomCode && (
                <div className="py-4">
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)', marginBottom: '12px', letterSpacing: '.2em' }}>YOUR ROOM CODE</div>
                  <div className="inline-block px-6 py-4 mb-4" style={{ border: '4px solid var(--neon-pink)', boxShadow: '0 0 20px rgba(255,45,117,.4)' }}>
                    <div style={{ fontFamily: 'var(--pixel)', fontSize: '28px', letterSpacing: '.3em', color: 'var(--neon-pink)', textShadow: '0 0 15px var(--neon-pink)' }}>{roomCode}</div>
                  </div>
                  <p style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)', marginBottom: '16px' }}>Share this code with your friend</p>
                  <button onClick={() => navigator.clipboard?.writeText(roomCode)} className="g-btn ghost sm mb-6">📋 COPY CODE</button>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)', animation: 'g-pulse 1.2s steps(2) infinite' }}>WAITING{searchDots}</div>
                  <button onClick={() => { setWaitingFriend(false); setRoomCode(''); }}
                    className="mt-4 block mx-auto" style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--txt-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
              {friendTab === 'join' && !waitingFriend && (
                <>
                  <span className="g-eyebrow" style={{ color: 'var(--neon-pink)' }}>// JOIN A ROOM</span>
                  <p style={{ fontFamily: 'var(--body)', fontSize: '20px', color: 'var(--txt-dim)', marginBottom: '24px' }}>Enter the code your friend shared.</p>
                  <input
                    style={{ width: '100%', background: 'var(--void)', border: '4px solid var(--panel-line)', fontFamily: 'var(--pixel)', fontSize: '18px', color: '#fff', padding: '14px', textAlign: 'center', letterSpacing: '.3em', outline: 'none', marginBottom: '16px' }}
                    placeholder="GMF-XXX" value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 7))}
                    onFocus={e => (e.target.style.borderColor = 'var(--neon-pink)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--panel-line)')}
                    onKeyDown={e => e.key === 'Enter' && joinRoom()}
                  />
                  <button onClick={joinRoom} disabled={joinCode.trim().length < 3} className="g-btn pink full" style={{ fontSize: '11px' }}>🔑 JOIN ROOM</button>
                </>
              )}
              {friendTab === 'join' && waitingFriend && (
                <div className="py-6">
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '22px', letterSpacing: '.3em', color: 'var(--neon-pink)', textShadow: '0 0 10px var(--neon-pink)', marginBottom: '12px' }}>{joinCode}</div>
                  <div style={{ fontFamily: 'var(--pixel)', fontSize: '10px', color: '#fff', marginBottom: '8px' }}>CONNECTING{searchDots}</div>
                  <div style={{ fontFamily: 'var(--body)', fontSize: '18px', color: 'var(--txt-dim)' }}>Finding your friend's room...</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => setScreen('profile')} className="g-btn ghost sm flex-1">👤 PROFILE</button>
          <button onClick={() => setScreen('leaderboard')} className="g-btn sm flex-1" style={{ background: 'var(--neon-yel)', color: 'var(--void)' }}>🏆 LEADERBOARD</button>
          <button onClick={() => setScreen('login')} className="g-btn ghost sm">← SWITCH</button>
        </div>
      </div>

      {showP2eModal && (
        <P2eModal username={player1.profile.username} onClose={() => setShowP2eModal(false)} onReady={() => { setShowP2eModal(false); setMode('p2e'); startRandomSearch(); }} />
      )}
    </div>
  );
}
