import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { Fighter } from '../types';
import { connectBankrKey, checkBankrExists, BankrWalletData } from '../utils/bankrClient';
import { getWalletBalance, isValidAddress } from '../utils/baseRpc';

const P2E_MIN_USD = 5;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'GMF-' + Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function OnlinePulse({ count, label, color = '#00ff41' }: { count: number; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
      </span>
      <span className="font-pixel" style={{ color, fontSize: '9px' }}>
        {count.toLocaleString()} {label}
      </span>
    </div>
  );
}

/* ─── P2E Modal ─────────────────────────────────────────────────────── */

function P2eModal({
  username,
  onClose,
  onReady,
}: {
  username: string;
  onClose: () => void;
  onReady: (wallet: BankrWalletData) => void;
}) {
  const { walletAddress, setWalletAddress } = useGameStore();
  const [step, setStep] = useState<'check' | 'connect' | 'confirm' | 'error'>('check');
  const [tab, setTab] = useState<'bankr' | 'manual'>('bankr');
  const [bankrKey, setBankrKey] = useState('');
  const [manualAddr, setManualAddr] = useState('');
  const [walletData, setWalletData] = useState<BankrWalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // On mount: if wallet already stored, load balance
  useEffect(() => {
    if (walletAddress) {
      loadExistingWallet(walletAddress);
    } else {
      setStep('connect');
    }
  }, []);

  const loadExistingWallet = async (addr: string) => {
    setLoading(true);
    try {
      const bal = await getWalletBalance(addr);
      const data: BankrWalletData = {
        evmAddress: addr,
        twitterUsername: null,
        baseUsd: bal.totalUsd,
        usdc: bal.usdc,
        eth: bal.eth,
        ethUsd: bal.eth * bal.ethPriceUsd,
      };
      setWalletData(data);
      setStep('confirm');
    } catch {
      setStep('connect');
    } finally {
      setLoading(false);
    }
  };

  const connectWithKey = async () => {
    const key = bankrKey.trim();
    if (!key) return;
    setLoading(true);
    setErrMsg('');
    try {
      const data = await connectBankrKey(key, username);
      setWalletAddress(data.evmAddress);
      setWalletData(data);
      setStep('confirm');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const connectManual = async () => {
    const addr = manualAddr.trim();
    if (!isValidAddress(addr)) { setErrMsg('Invalid address format (0x..., 42 chars).'); return; }
    setLoading(true);
    setErrMsg('');
    try {
      const bal = await getWalletBalance(addr);
      setWalletAddress(addr);
      const data: BankrWalletData = {
        evmAddress: addr,
        twitterUsername: null,
        baseUsd: bal.totalUsd,
        usdc: bal.usdc,
        eth: bal.eth,
        ethUsd: bal.eth * bal.ethPriceUsd,
      };
      setWalletData(data);
      setStep('confirm');
    } catch {
      setErrMsg('Failed to read balance from Base chain.');
    } finally {
      setLoading(false);
    }
  };

  const eligible = walletData && walletData.baseUsd >= P2E_MIN_USD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-lg p-6 relative"
        style={{ background: '#0d001a', border: '2px solid #ffd700', boxShadow: '0 0 40px #ffd70030' }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 font-mono text-gray-600 hover:text-gray-300"
          style={{ fontSize: '18px' }}>✕</button>

        {/* Title */}
        <div className="text-center mb-5">
          <div className="font-pixel text-2xl mb-1" style={{ color: '#ffd700', textShadow: '0 0 15px #ffd700' }}>
            💰 PLAY TO EARN
          </div>
          <div className="font-mono text-gray-400" style={{ fontSize: '11px' }}>
            Minimum ${P2E_MIN_USD} on Base · 90% to winner
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-6">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: '#ffd700', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="font-mono text-gray-400" style={{ fontSize: '11px' }}>Checking wallet...</span>
          </div>
        )}

        {/* CONNECT */}
        {!loading && step === 'connect' && (
          <div>
            <div className="mb-4 p-3 rounded text-center"
              style={{ background: '#12002a', border: '1px solid #2a0050' }}>
              <div className="font-mono text-gray-400" style={{ fontSize: '11px' }}>
                Connect your Bankr wallet to play P2E.
                Bankr gives every X account a free Base wallet.
              </div>
              <a href="https://bankr.bot" target="_blank" rel="noopener"
                className="font-pixel mt-2 inline-block"
                style={{ color: '#1d9bf0', fontSize: '8px' }}>
                → Get Bankr at bankr.bot
              </a>
            </div>

            {/* Tabs */}
            <div className="flex mb-4 rounded overflow-hidden" style={{ border: '1px solid #2a0050' }}>
              {(['bankr', 'manual'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-2 font-pixel transition-all"
                  style={{
                    fontSize: '8px',
                    background: tab === t ? '#1a0040' : 'transparent',
                    color: tab === t ? '#ffd700' : '#444',
                    borderBottom: tab === t ? '2px solid #ffd700' : '2px solid transparent',
                  }}>
                  {t === 'bankr' ? '🔑 BANKR API KEY' : '✏️ WALLET ADDRESS'}
                </button>
              ))}
            </div>

            {tab === 'bankr' && (
              <div>
                <div className="font-mono mb-2" style={{ fontSize: '10px', color: '#666' }}>
                  DM <span style={{ color: '#1d9bf0' }}>@bankrbot</span> on X: <em style={{ color: '#aaa' }}>"my api key"</em>
                  {' '}or visit <span style={{ color: '#1d9bf0' }}>bankr.bot/api</span>
                </div>
                <div className="flex gap-2 mb-1">
                  <input
                    className="flex-1 bg-black font-mono text-white px-3 py-2 outline-none rounded"
                    style={{ border: '1px solid #2a0050', fontSize: '11px' }}
                    placeholder="bk_xxxxxxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    value={bankrKey}
                    onChange={e => setBankrKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && connectWithKey()}
                    autoFocus
                  />
                  <button onClick={connectWithKey}
                    className="font-pixel px-4 py-2 rounded transition-all hover:scale-[1.02]"
                    style={{ background: '#ffd700', color: '#000', fontSize: '8px' }}>
                    CONNECT
                  </button>
                </div>
                <div className="font-mono" style={{ fontSize: '9px', color: '#444' }}>
                  🔒 Read-only. Verifies identity + balance only. Not stored.
                </div>
              </div>
            )}

            {tab === 'manual' && (
              <div>
                <div className="font-mono mb-2" style={{ fontSize: '10px', color: '#666' }}>
                  Enter your Base chain wallet address (0x...)
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-black font-mono text-white px-3 py-2 outline-none rounded"
                    style={{ border: '1px solid #2a0050', fontSize: '11px' }}
                    placeholder="0xabc123..."
                    value={manualAddr}
                    onChange={e => setManualAddr(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && connectManual()}
                    autoFocus
                  />
                  <button onClick={connectManual}
                    className="font-pixel px-4 py-2 rounded transition-all hover:scale-[1.02]"
                    style={{ background: '#ffd700', color: '#000', fontSize: '8px' }}>
                    CHECK
                  </button>
                </div>
              </div>
            )}

            {errMsg && (
              <div className="mt-3 font-mono" style={{ fontSize: '10px', color: '#ff6060' }}>⚠ {errMsg}</div>
            )}
          </div>
        )}

        {/* CONFIRM */}
        {!loading && step === 'confirm' && walletData && (
          <div>
            {/* Verified badge */}
            {walletData.twitterUsername && (
              <div className="flex items-center gap-2 mb-4 p-2 rounded"
                style={{ background: '#001020', border: '1px solid #1d9bf020' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#1d9bf0">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="font-mono" style={{ fontSize: '11px', color: '#1d9bf0' }}>
                  @{walletData.twitterUsername}
                </span>
                <span className="ml-auto font-pixel" style={{ fontSize: '7px', color: '#00ff41' }}>✓ VERIFIED</span>
              </div>
            )}

            {/* Balance */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-3 rounded" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
                <div className="font-mono" style={{ fontSize: '9px', color: '#26a17b' }}>USDC</div>
                <div className="font-pixel mt-1" style={{ fontSize: '13px', color: '#fff' }}>${walletData.usdc.toFixed(2)}</div>
              </div>
              <div className="text-center p-3 rounded" style={{ background: '#0a0018', border: '1px solid #1a0030' }}>
                <div className="font-mono" style={{ fontSize: '9px', color: '#627eea' }}>ETH</div>
                <div className="font-pixel mt-1" style={{ fontSize: '13px', color: '#fff' }}>{walletData.eth.toFixed(4)}</div>
              </div>
              <div className="text-center p-3 rounded"
                style={{ background: eligible ? '#001a00' : '#1a0005', border: `1px solid ${eligible ? '#00ff4130' : '#ff003030'}` }}>
                <div className="font-mono" style={{ fontSize: '9px', color: eligible ? '#00ff41' : '#ff4040' }}>TOTAL</div>
                <div className="font-pixel mt-1" style={{ fontSize: '13px', color: eligible ? '#00ff41' : '#ff4040' }}>
                  ${walletData.baseUsd.toFixed(2)}
                </div>
              </div>
            </div>

            {eligible ? (
              <>
                <div className="text-center p-3 rounded mb-4"
                  style={{ background: '#001500', border: '1px solid #00ff4130' }}>
                  <div className="font-pixel mb-1" style={{ fontSize: '8px', color: '#00ff41' }}>
                    ✓ READY TO PLAY — $5 STAKE
                  </div>
                  <div className="font-mono" style={{ fontSize: '10px', color: '#888' }}>
                    Winner takes 90% · Platform fee 10%
                  </div>
                </div>
                <button
                  onClick={() => onReady(walletData)}
                  className="w-full font-pixel py-4 rounded transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #ff8800)',
                    color: '#000',
                    fontSize: '11px',
                    letterSpacing: '1px',
                    boxShadow: '0 0 25px #ffd70050',
                  }}>
                  ⚔ ENTER P2E MATCH
                </button>
              </>
            ) : (
              <>
                <div className="text-center p-3 rounded mb-4"
                  style={{ background: '#1a0005', border: '1px solid #ff003030' }}>
                  <div className="font-pixel mb-1" style={{ fontSize: '8px', color: '#ff4040' }}>
                    INSUFFICIENT BALANCE
                  </div>
                  <div className="font-mono" style={{ fontSize: '10px', color: '#888' }}>
                    Need ${(P2E_MIN_USD - walletData.baseUsd).toFixed(2)} more on Base to play P2E
                  </div>
                </div>
                <div className="font-mono text-center mb-3" style={{ fontSize: '10px', color: '#666' }}>
                  Top up via <span style={{ color: '#1d9bf0' }}>@bankrbot</span> on X:
                  <em style={{ color: '#aaa' }}> "deposit $10 USDC to Base"</em>
                </div>
                <button
                  onClick={() => { setStep('connect'); setWalletAddress(null); setWalletData(null); }}
                  className="w-full font-pixel py-3 rounded"
                  style={{ background: 'transparent', border: '1px solid #333', color: '#666', fontSize: '8px' }}>
                  ← USE DIFFERENT WALLET
                </button>
              </>
            )}

            {walletData.leaderboardRank && (
              <div className="text-center mt-3 font-pixel" style={{ fontSize: '7px', color: '#555' }}>
                BANKR RANK #{walletData.leaderboardRank}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ModeSelect ────────────────────────────────────────────────────── */

export function ModeSelect() {
  const {
    player1, setPlayer2, setScreen, setMode, setMatchMode,
    onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches,
    roomCode, setRoomCode, walletAddress,
  } = useGameStore();

  const [tab, setTab] = useState<'random' | 'friend'>('random');
  const [friendTab, setFriendTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [waitingFriend, setWaitingFriend] = useState(false);
  const [searchDots, setSearchDots] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showP2eModal, setShowP2eModal] = useState(false);
  const [bankrExists, setBankrExists] = useState<boolean | null>(null);

  // Fluctuate online numbers
  useEffect(() => {
    const iv = setInterval(() => {
      setOnlinePlayers(onlinePlayers + Math.floor((Math.random() - 0.4) * 5));
      setActiveMatches(Math.max(5, activeMatches + Math.floor((Math.random() - 0.4) * 3)));
    }, 3000);
    return () => clearInterval(iv);
  }, [onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches]);

  // Animate dots
  useEffect(() => {
    if (!searching && !waitingFriend) return;
    const iv = setInterval(() => setSearchDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(iv);
  }, [searching, waitingFriend]);

  // Background Bankr existence check on mount
  useEffect(() => {
    if (!player1) return;
    checkBankrExists(player1.profile.username).then(setBankrExists);
  }, [player1]);

  const pickRandomOpponent = useCallback(() => {
    const others = DEMO_PROFILES.filter(p => p.username !== player1?.profile.username);
    const picked = others[Math.floor(Math.random() * others.length)];
    const fighter: Fighter = { profile: picked, stats: calculateFighterStats(picked) };
    setPlayer2(fighter);
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

  const startP2eMatch = (wallet: BankrWalletData) => {
    setShowP2eModal(false);
    setMode('p2e');
    startRandomSearch();
    void wallet; // wallet stored in gameStore already
  };

  const createRoom = () => {
    setRoomCode(generateRoomCode());
    setWaitingFriend(true);
    setTimeout(() => { setWaitingFriend(false); pickRandomOpponent(); setMatchMode('friend'); },
      4000 + Math.random() * 4000);
  };

  const joinRoom = () => {
    if (joinCode.trim().length < 3) return;
    setWaitingFriend(true);
    setTimeout(() => { setWaitingFriend(false); pickRandomOpponent(); setMatchMode('friend'); }, 2000);
  };

  if (!player1) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4">
      <div className="w-full max-w-lg">

        {/* Fighter header */}
        <div className="text-center mb-6">
          <div className="font-pixel text-xs mb-2" style={{ color: '#bf00ff' }}>FIGHTER SELECTED</div>

          <div className="flex items-center justify-center gap-3 mb-4 p-3 rounded"
            style={{ background: '#12002a', border: '1px solid #2a0050' }}>
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0"
              style={{ border: `2px solid ${player1.stats.color}`, boxShadow: `0 0 8px ${player1.stats.glowColor}` }}>
              <img
                src={player1.profile.avatarUrl} alt={player1.profile.username}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player1.profile.username}`; }}
              />
            </div>
            <div className="text-left flex-1">
              <div className="flex items-center gap-2">
                <div className="font-pixel text-white" style={{ fontSize: '9px' }}>@{player1.profile.username}</div>
                {/* Bankr status dot */}
                {bankrExists !== null && (
                  <span title={bankrExists ? 'Has Bankr wallet' : 'No Bankr wallet found'}
                    className="w-2 h-2 rounded-full"
                    style={{ background: bankrExists ? '#ffd700' : '#333', boxShadow: bankrExists ? '0 0 4px #ffd700' : 'none' }} />
                )}
                {walletAddress && (
                  <span className="font-pixel" style={{ fontSize: '6px', color: '#00ff41' }}>● WALLET</span>
                )}
              </div>
              <div className="font-pixel mt-0.5" style={{ color: player1.stats.color, fontSize: '7px' }}>
                {player1.stats.archetypeLabel.toUpperCase()} · {player1.stats.tier.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-pixel" style={{ color: '#ffff00', fontSize: '10px' }}>PWR {player1.stats.basePower}</div>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            <OnlinePulse count={onlinePlayers} label="online" />
            <OnlinePulse count={activeMatches} label="in battle" color="#ff6600" />
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-4 rounded overflow-hidden" style={{ border: '1px solid #2a0050' }}>
          {(['random', 'friend'] as const).map(t => (
            <button key={t}
              onClick={() => { setTab(t); setSearching(false); setWaitingFriend(false); }}
              className="flex-1 py-3 font-pixel transition-all"
              style={{
                fontSize: '9px',
                background: tab === t ? (t === 'random' ? '#00ffff20' : '#ff00ff20') : 'transparent',
                color: tab === t ? (t === 'random' ? '#00ffff' : '#ff00ff') : '#444',
                borderBottom: tab === t ? `2px solid ${t === 'random' ? '#00ffff' : '#ff00ff'}` : '2px solid transparent',
              }}>
              {t === 'random' ? '🎲 RANDOM MATCH' : '👥 PLAY WITH FRIEND'}
            </button>
          ))}
        </div>

        {/* Random Match */}
        {tab === 'random' && (
          <div className="p-5 rounded text-center" style={{ background: '#12002a', border: '1px solid #2a0050' }}>
            {!searching ? (
              <>
                <div className="text-4xl mb-3">🎲</div>
                <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>RANDOM MATCHMAKING</div>
                <div className="font-mono text-gray-400 text-sm mb-5">
                  Get matched with a random fighter. Ranked by Twitter Score.
                </div>

                {/* Avatars preview */}
                <div className="flex justify-center gap-2 mb-5">
                  {DEMO_PROFILES.filter(p => p.username !== player1.profile.username).slice(0, 4).map(p => (
                    <div key={p.username} className="w-8 h-8 rounded overflow-hidden opacity-60"
                      style={{ border: '1px solid #2a0050' }}>
                      <img src={p.avatarUrl} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.username}`; }} />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded flex items-center justify-center font-pixel"
                    style={{ background: '#0d001a', border: '1px solid #2a0050', fontSize: '7px', color: '#666' }}>
                    +{onlinePlayers - 4}
                  </div>
                </div>

                {/* Free match */}
                <button onClick={() => { setMode('free'); startRandomSearch(); }}
                  className="w-full font-pixel py-3 mb-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #00ffff20, #0080ff20)',
                    border: '2px solid #00ffff',
                    color: '#00ffff',
                    boxShadow: '0 0 20px #00ffff20',
                    letterSpacing: '1px', fontSize: '10px',
                  }}>
                  ▶ FREE MATCH
                </button>

                {/* P2E match */}
                <button onClick={() => setShowP2eModal(true)}
                  className="w-full font-pixel py-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #ffd70020, #ff880020)',
                    border: '2px solid #ffd700',
                    color: '#ffd700',
                    boxShadow: '0 0 20px #ffd70020',
                    letterSpacing: '1px', fontSize: '10px',
                  }}>
                  💰 P2E MATCH — $5 STAKE
                </button>
              </>
            ) : (
              <div className="py-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full animate-spin"
                    style={{ border: '2px solid transparent', borderTopColor: '#00ffff', borderRightColor: '#00ffff40' }} />
                  <div className="absolute inset-3 rounded-full animate-spin"
                    style={{ border: '2px solid transparent', borderTopColor: '#ff00ff', animationDirection: 'reverse', animationDuration: '0.8s' }} />
                  <div className="absolute inset-0 flex items-center justify-center font-pixel text-xs" style={{ color: '#00ffff' }}>
                    {countdown > 0 ? countdown : '!'}
                  </div>
                </div>
                <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>SEARCHING{searchDots}</div>
                <div className="font-mono text-gray-500 text-sm mb-6">Scanning {onlinePlayers} fighters...</div>
                <button onClick={() => setSearching(false)} className="font-mono text-gray-600 hover:text-gray-400 text-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Play with Friend */}
        {tab === 'friend' && (
          <div className="rounded overflow-hidden" style={{ border: '1px solid #2a0050' }}>
            <div className="flex" style={{ background: '#0d001a' }}>
              {(['create', 'join'] as const).map(ft => (
                <button key={ft}
                  onClick={() => { setFriendTab(ft); setWaitingFriend(false); setRoomCode(''); }}
                  className="flex-1 py-2 font-pixel transition-all"
                  style={{
                    fontSize: '8px',
                    color: friendTab === ft ? '#ff00ff' : '#444',
                    borderBottom: friendTab === ft ? '2px solid #ff00ff' : '2px solid transparent',
                    background: 'transparent',
                  }}>
                  {ft === 'create' ? '➕ CREATE ROOM' : '🔑 JOIN ROOM'}
                </button>
              ))}
            </div>

            <div className="p-5 text-center" style={{ background: '#12002a' }}>
              {friendTab === 'create' && !waitingFriend && (
                <>
                  <div className="text-4xl mb-4">🏠</div>
                  <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>CREATE A ROOM</div>
                  <div className="font-mono text-gray-400 text-sm mb-6">
                    Generate a room code and share it with your friend.
                  </div>
                  <button onClick={createRoom}
                    className="w-full font-pixel py-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #ff00ff20, #bf00ff20)', border: '2px solid #ff00ff', color: '#ff00ff', boxShadow: '0 0 20px #ff00ff30' }}>
                    ➕ GENERATE ROOM CODE
                  </button>
                </>
              )}

              {friendTab === 'create' && waitingFriend && roomCode && (
                <div className="py-4">
                  <div className="font-pixel text-gray-400 mb-3" style={{ fontSize: '8px' }}>YOUR ROOM CODE</div>
                  <div className="inline-block px-6 py-4 rounded mb-4"
                    style={{ background: '#0d001a', border: '2px solid #ff00ff', boxShadow: '0 0 20px #ff00ff40' }}>
                    <div className="font-pixel text-3xl tracking-widest"
                      style={{ color: '#ff00ff', textShadow: '0 0 15px #ff00ff' }}>{roomCode}</div>
                  </div>
                  <div className="font-mono text-gray-400 text-sm mb-4">Share this code with your friend</div>
                  <button onClick={() => navigator.clipboard?.writeText(roomCode)}
                    className="font-pixel text-xs px-4 py-2 rounded mb-6"
                    style={{ background: '#2a0050', color: '#bf00ff', border: '1px solid #bf00ff' }}>
                    📋 COPY CODE
                  </button>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full"
                          style={{ background: '#ff00ff', animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <div className="font-pixel text-gray-400" style={{ fontSize: '8px' }}>WAITING{searchDots}</div>
                  </div>
                  <button onClick={() => { setWaitingFriend(false); setRoomCode(''); }}
                    className="mt-4 font-mono text-gray-600 hover:text-gray-400 text-sm block mx-auto">Cancel</button>
                </div>
              )}

              {friendTab === 'join' && !waitingFriend && (
                <>
                  <div className="text-4xl mb-4">🔑</div>
                  <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>JOIN A ROOM</div>
                  <div className="font-mono text-gray-400 text-sm mb-6">Enter the code your friend shared.</div>
                  <input
                    className="w-full bg-black font-pixel text-center text-white px-4 py-3 mb-4 rounded outline-none"
                    style={{ border: '2px solid #2a0050', fontSize: '14px', letterSpacing: '4px' }}
                    placeholder="GMF-XXX"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 7))}
                    onFocus={e => (e.target.style.borderColor = '#ff00ff')}
                    onBlur={e => (e.target.style.borderColor = '#2a0050')}
                    onKeyDown={e => e.key === 'Enter' && joinRoom()}
                  />
                  <button onClick={joinRoom} disabled={joinCode.trim().length < 3}
                    className="w-full font-pixel py-4 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #ff00ff20, #bf00ff20)', border: '2px solid #ff00ff', color: '#ff00ff' }}>
                    🔑 JOIN ROOM
                  </button>
                </>
              )}

              {friendTab === 'join' && waitingFriend && (
                <div className="py-8">
                  <div className="font-pixel text-xl mb-4 tracking-widest"
                    style={{ color: '#ff00ff', textShadow: '0 0 10px #ff00ff' }}>{joinCode}</div>
                  <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>CONNECTING{searchDots}</div>
                  <div className="font-mono text-gray-500 text-sm">Finding your friend's room...</div>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={() => setScreen('login')}
          className="mt-4 font-mono text-gray-600 hover:text-gray-400 text-sm w-full text-center">
          ← Change Fighter
        </button>
      </div>

      {/* P2E Modal */}
      {showP2eModal && (
        <P2eModal
          username={player1.profile.username}
          onClose={() => setShowP2eModal(false)}
          onReady={startP2eMatch}
        />
      )}
    </div>
  );
}
