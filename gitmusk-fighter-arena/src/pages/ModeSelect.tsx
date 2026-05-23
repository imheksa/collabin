import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { Fighter } from '../types';
import { connectBankrKey, BankrWalletData } from '../utils/bankrClient';
import { getWalletBalance, isValidAddress } from '../utils/baseRpc';

const P2E_MIN_USD = 5;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'GMF-' + Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function OnlinePulse({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: '#00ff41' }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00ff41' }} />
      </span>
      <span className="font-pixel" style={{ color: '#00ff41', fontSize: '9px' }}>
        {count.toLocaleString()} {label}
      </span>
    </div>
  );
}

type WalletState = 'idle' | 'connecting' | 'ready' | 'error';

function WalletPanel({
  username,
  walletAddress,
  onAddressSet,
}: {
  username: string;
  walletAddress: string | null;
  onAddressSet: (addr: string) => void;
}) {
  const { setWalletAddress } = useGameStore();
  const [state, setState] = useState<WalletState>('idle');
  const [bankrData, setBankrData] = useState<BankrWalletData | null>(null);
  const [tab, setTab] = useState<'bankr' | 'manual'>('bankr');
  const [bankrKey, setBankrKey] = useState('');
  const [manualAddr, setManualAddr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Resume from stored address
  useEffect(() => {
    if (walletAddress && state === 'idle') {
      getWalletBalance(walletAddress)
        .then(bal => {
          setBankrData({ evmAddress: walletAddress, twitterUsername: null, baseUsd: bal.totalUsd, usdc: bal.usdc, eth: bal.eth, ethUsd: bal.eth * bal.ethPriceUsd });
          setState('ready');
        })
        .catch(() => {});
    }
  }, []);

  const handleBankrKey = async () => {
    const key = bankrKey.trim();
    if (!key) return;
    setState('connecting');
    setErrorMsg('');
    try {
      const data = await connectBankrKey(key, username);
      setWalletAddress(data.evmAddress);
      onAddressSet(data.evmAddress);
      setBankrData(data);
      setState('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed.');
      setState('error');
    }
  };

  const handleManual = async () => {
    const addr = manualAddr.trim();
    if (!isValidAddress(addr)) { setErrorMsg('Invalid address (must be 0x..., 42 chars).'); return; }
    setState('connecting');
    setErrorMsg('');
    try {
      const bal = await getWalletBalance(addr);
      setWalletAddress(addr);
      onAddressSet(addr);
      setBankrData({ evmAddress: addr, twitterUsername: null, baseUsd: bal.totalUsd, usdc: bal.usdc, eth: bal.eth, ethUsd: bal.eth * bal.ethPriceUsd });
      setState('ready');
    } catch {
      setErrorMsg('Failed to read balance from Base chain.');
      setState('error');
    }
  };

  const reset = () => {
    setState('idle'); setBankrData(null); setWalletAddress(null);
    onAddressSet(''); setErrorMsg(''); setBankrKey(''); setManualAddr('');
  };

  const eligible = bankrData && bankrData.baseUsd >= P2E_MIN_USD;
  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="mb-4 p-4 rounded" style={{ background: '#0a001a', border: '1px solid #2a0050' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-pixel" style={{ fontSize: '8px', color: '#ffff00' }}>💰 P2E WALLET (BASE)</div>
        {state === 'ready' && bankrData && (
          <span className="font-mono" style={{ fontSize: '10px', color: '#555' }}>{short(bankrData.evmAddress)}</span>
        )}
      </div>

      {/* IDLE */}
      {state === 'idle' && (
        <div>
          {/* Tabs */}
          <div className="flex mb-3 rounded overflow-hidden" style={{ border: '1px solid #1a0030' }}>
            {(['bankr', 'manual'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 font-pixel transition-all"
                style={{
                  fontSize: '7px',
                  background: tab === t ? '#1a0040' : 'transparent',
                  color: tab === t ? '#bf00ff' : '#444',
                  borderBottom: tab === t ? '2px solid #bf00ff' : '2px solid transparent',
                }}>
                {t === 'bankr' ? '🔑 BANKR API KEY' : '✏️ WALLET ADDRESS'}
              </button>
            ))}
          </div>

          {tab === 'bankr' && (
            <div>
              <div className="font-mono mb-2" style={{ fontSize: '10px', color: '#666' }}>
                Get your key: <span style={{ color: '#1d9bf0' }}>bankr.bot/api</span>
                {' '}— or DM <span style={{ color: '#1d9bf0' }}>@bankrbot</span>: <em>"my api key"</em>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-black font-mono text-white px-3 py-2 outline-none"
                  style={{ border: '1px solid #2a0050', fontSize: '11px' }}
                  placeholder="bk_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={bankrKey}
                  type="password"
                  onChange={e => setBankrKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBankrKey()}
                />
                <button onClick={handleBankrKey}
                  className="font-pixel px-4 py-2 transition-all hover:scale-[1.02]"
                  style={{ background: '#bf00ff', color: '#000', fontSize: '8px' }}>
                  CONNECT
                </button>
              </div>
              <div className="mt-2 font-mono" style={{ fontSize: '9px', color: '#444' }}>
                🔒 Key used read-only to verify your balance. Not stored anywhere.
              </div>
            </div>
          )}

          {tab === 'manual' && (
            <div>
              <div className="font-mono mb-2" style={{ fontSize: '10px', color: '#666' }}>
                Paste your Base chain wallet address
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-black font-mono text-white px-3 py-2 outline-none"
                  style={{ border: '1px solid #2a0050', fontSize: '11px' }}
                  placeholder="0xabc123..."
                  value={manualAddr}
                  onChange={e => setManualAddr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManual()}
                />
                <button onClick={handleManual}
                  className="font-pixel px-4 py-2 transition-all hover:scale-[1.02]"
                  style={{ background: '#bf00ff', color: '#000', fontSize: '8px' }}>
                  CHECK
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-2 font-mono" style={{ fontSize: '10px', color: '#ff6060' }}>⚠ {errorMsg}</div>
          )}
        </div>
      )}

      {/* CONNECTING */}
      {state === 'connecting' && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: '#bf00ff', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className="font-mono text-gray-500" style={{ fontSize: '11px' }}>
            {tab === 'bankr' ? 'Connecting to Bankr API...' : 'Reading Base chain...'}
          </span>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <div>
          <div className="font-mono mb-2" style={{ fontSize: '10px', color: '#ff6060' }}>⚠ {errorMsg}</div>
          <button onClick={reset} className="font-mono text-gray-500 hover:text-gray-300" style={{ fontSize: '10px' }}>
            ← Try again
          </button>
        </div>
      )}

      {/* READY */}
      {state === 'ready' && bankrData && (
        <div>
          {/* Twitter verification badge */}
          {bankrData.twitterUsername && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded"
              style={{ background: '#001020', border: '1px solid #1d9bf020' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1d9bf0">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-mono" style={{ fontSize: '10px', color: '#1d9bf0' }}>
                @{bankrData.twitterUsername}
              </span>
              {bankrData.twitterUsername.toLowerCase() === username.toLowerCase() && (
                <span className="font-pixel ml-auto" style={{ fontSize: '7px', color: '#00ff41' }}>✓ VERIFIED</span>
              )}
            </div>
          )}

          {/* Balance grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 rounded" style={{ background: '#0d001a', border: '1px solid #1a0030' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: '#26a17b' }}>USDC</div>
              <div className="font-pixel mt-0.5" style={{ fontSize: '11px', color: '#fff' }}>${bankrData.usdc.toFixed(2)}</div>
            </div>
            <div className="text-center p-2 rounded" style={{ background: '#0d001a', border: '1px solid #1a0030' }}>
              <div className="font-mono" style={{ fontSize: '9px', color: '#627eea' }}>ETH</div>
              <div className="font-pixel mt-0.5" style={{ fontSize: '11px', color: '#fff' }}>{bankrData.eth.toFixed(4)}</div>
            </div>
            <div className="text-center p-2 rounded"
              style={{ background: eligible ? '#001a00' : '#0d001a', border: `1px solid ${eligible ? '#00ff4130' : '#1a0030'}` }}>
              <div className="font-mono" style={{ fontSize: '9px', color: eligible ? '#00ff41' : '#555' }}>TOTAL</div>
              <div className="font-pixel mt-0.5" style={{ fontSize: '11px', color: eligible ? '#00ff41' : '#ff4040' }}>
                ${bankrData.baseUsd.toFixed(2)}
              </div>
            </div>
          </div>

          {/* P2E status */}
          {eligible ? (
            <div className="flex items-center gap-2 p-2 rounded"
              style={{ background: '#001500', border: '1px solid #00ff4130' }}>
              <span style={{ color: '#00ff41' }}>✓</span>
              <div className="font-pixel" style={{ fontSize: '8px', color: '#00ff41' }}>
                P2E UNLOCKED — min ${P2E_MIN_USD} met
              </div>
              {bankrData.leaderboardRank && (
                <span className="ml-auto font-pixel" style={{ fontSize: '7px', color: '#ffff00' }}>
                  RANK #{bankrData.leaderboardRank}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded"
              style={{ background: '#1a0000', border: '1px solid #ff004030' }}>
              <span style={{ color: '#ff4040' }}>✕</span>
              <div className="font-pixel" style={{ fontSize: '8px', color: '#ff4040' }}>
                NEED ${(P2E_MIN_USD - bankrData.baseUsd).toFixed(2)} MORE on Base to play P2E
              </div>
            </div>
          )}

          <button onClick={reset}
            className="mt-2 font-mono text-gray-600 hover:text-gray-400"
            style={{ fontSize: '10px' }}>
            ↺ Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function ModeSelect() {
  const {
    player1, setPlayer2, setScreen, setMatchMode,
    onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches,
    roomCode, setRoomCode, walletAddress, setWalletAddress,
  } = useGameStore();

  const [tab, setTab] = useState<'random' | 'friend'>('random');
  const [friendTab, setFriendTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [waitingFriend, setWaitingFriend] = useState(false);
  const [searchDots, setSearchDots] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [localWallet, setLocalWallet] = useState(walletAddress ?? '');

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlinePlayers(onlinePlayers + Math.floor((Math.random() - 0.4) * 5));
      setActiveMatches(Math.max(5, activeMatches + Math.floor((Math.random() - 0.4) * 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, [onlinePlayers, activeMatches, setOnlinePlayers, setActiveMatches]);

  useEffect(() => {
    if (!searching && !waitingFriend) return;
    const interval = setInterval(() => {
      setSearchDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, [searching, waitingFriend]);

  const pickRandomOpponent = useCallback(() => {
    const others = DEMO_PROFILES.filter(p => p.username !== player1?.profile.username);
    const picked = others[Math.floor(Math.random() * others.length)];
    const stats = calculateFighterStats(picked);
    const fighter: Fighter = { profile: picked, stats };
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

  const createRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
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

        {/* Header */}
        <div className="text-center mb-6">
          <div className="font-pixel text-xs mb-2" style={{ color: '#bf00ff' }}>FIGHTER SELECTED</div>

          <div className="flex items-center justify-center gap-3 mb-4 p-3 rounded"
            style={{ background: '#12002a', border: '1px solid #2a0050' }}>
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0"
              style={{ border: `2px solid ${player1.stats.color}`, boxShadow: `0 0 8px ${player1.stats.glowColor}` }}>
              <img
                src={player1.profile.avatarUrl}
                alt={player1.profile.username}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player1.profile.username}`; }}
              />
            </div>
            <div className="text-left">
              <div className="font-pixel text-white" style={{ fontSize: '9px' }}>@{player1.profile.username}</div>
              <div className="font-pixel mt-0.5" style={{ color: player1.stats.color, fontSize: '7px' }}>
                {player1.stats.archetypeLabel.toUpperCase()} · {player1.stats.tier.toUpperCase()}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-pixel" style={{ color: '#ffff00', fontSize: '10px' }}>
                PWR {player1.stats.basePower}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            <OnlinePulse count={onlinePlayers} label="online" />
            <OnlinePulse count={activeMatches} label="in battle" />
          </div>
        </div>

        {/* Wallet / P2E panel */}
        <WalletPanel
          username={player1.profile.username}
          walletAddress={walletAddress}
          onAddressSet={addr => { setLocalWallet(addr); if (addr) setWalletAddress(addr); }}
        />

        {/* Mode tabs */}
        <div className="flex mb-4 rounded overflow-hidden" style={{ border: '1px solid #2a0050' }}>
          {(['random', 'friend'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearching(false); setWaitingFriend(false); }}
              className="flex-1 py-3 font-pixel transition-all"
              style={{
                fontSize: '9px',
                background: tab === t ? (t === 'random' ? '#00ffff20' : '#ff00ff20') : 'transparent',
                color: tab === t ? (t === 'random' ? '#00ffff' : '#ff00ff') : '#444',
                borderBottom: tab === t ? `2px solid ${t === 'random' ? '#00ffff' : '#ff00ff'}` : '2px solid transparent',
              }}
            >
              {t === 'random' ? '🎲 RANDOM MATCH' : '👥 PLAY WITH FRIEND'}
            </button>
          ))}
        </div>

        {/* Random Match */}
        {tab === 'random' && (
          <div className="p-5 rounded text-center" style={{ background: '#12002a', border: '1px solid #2a0050' }}>
            {!searching ? (
              <>
                <div className="text-4xl mb-4">🎲</div>
                <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>RANDOM MATCHMAKING</div>
                <div className="font-mono text-gray-400 text-sm mb-4">
                  Get matched with a random fighter online. Ranked by Twitter Score tier.
                </div>

                <div className="flex justify-center gap-2 mb-6">
                  {DEMO_PROFILES.filter(p => p.username !== player1.profile.username).slice(0, 4).map(p => (
                    <div key={p.username} className="w-8 h-8 rounded overflow-hidden opacity-60"
                      style={{ border: '1px solid #2a0050' }}>
                      <img src={p.avatarUrl} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.username}`; }}
                      />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded flex items-center justify-center font-pixel"
                    style={{ background: '#0d001a', border: '1px solid #2a0050', fontSize: '7px', color: '#666' }}>
                    +{onlinePlayers - 4}
                  </div>
                </div>

                {/* Free mode button */}
                <button
                  onClick={startRandomSearch}
                  className="w-full font-pixel py-3 text-sm transition-all hover:scale-105 active:scale-95 mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #00ffff20, #0080ff20)',
                    border: '2px solid #00ffff',
                    color: '#00ffff',
                    boxShadow: '0 0 20px #00ffff30',
                    letterSpacing: '1px',
                    fontSize: '10px',
                  }}
                >
                  ▶ FREE MATCH
                </button>

                {/* P2E mode button */}
                <button
                  onClick={localWallet ? startRandomSearch : undefined}
                  disabled={!localWallet}
                  title={!localWallet ? 'Link wallet above to enable P2E' : ''}
                  className="w-full font-pixel py-3 text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: localWallet ? 'linear-gradient(135deg, #ffd70020, #ff880020)' : 'transparent',
                    border: `2px solid ${localWallet ? '#ffd700' : '#333'}`,
                    color: localWallet ? '#ffd700' : '#444',
                    boxShadow: localWallet ? '0 0 20px #ffd70030' : 'none',
                    letterSpacing: '1px',
                    fontSize: '10px',
                  }}
                >
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
                <div className="font-mono text-gray-500 text-sm mb-6">Scanning {onlinePlayers} fighters online...</div>
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
                <button
                  key={ft}
                  onClick={() => { setFriendTab(ft); setWaitingFriend(false); setRoomCode(''); }}
                  className="flex-1 py-2 font-pixel transition-all"
                  style={{
                    fontSize: '8px',
                    color: friendTab === ft ? '#ff00ff' : '#444',
                    borderBottom: friendTab === ft ? '2px solid #ff00ff' : '2px solid transparent',
                    background: 'transparent',
                  }}
                >
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
                  <button
                    onClick={createRoom}
                    className="w-full font-pixel py-4 text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #ff00ff20, #bf00ff20)',
                      border: '2px solid #ff00ff',
                      color: '#ff00ff',
                      boxShadow: '0 0 20px #ff00ff30',
                    }}
                  >
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
                      style={{ color: '#ff00ff', textShadow: '0 0 15px #ff00ff' }}>
                      {roomCode}
                    </div>
                  </div>
                  <div className="font-mono text-gray-400 text-sm mb-4">Share this code with your friend</div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(roomCode)}
                    className="font-pixel text-xs px-4 py-2 rounded mb-6"
                    style={{ background: '#2a0050', color: '#bf00ff', border: '1px solid #bf00ff' }}
                  >
                    📋 COPY CODE
                  </button>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full"
                          style={{ background: '#ff00ff', animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <div className="font-pixel text-gray-400" style={{ fontSize: '8px' }}>
                      WAITING FOR FRIEND{searchDots}
                    </div>
                  </div>
                  <button
                    onClick={() => { setWaitingFriend(false); setRoomCode(''); }}
                    className="mt-4 font-mono text-gray-600 hover:text-gray-400 text-sm block mx-auto"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {friendTab === 'join' && !waitingFriend && (
                <>
                  <div className="text-4xl mb-4">🔑</div>
                  <div className="font-pixel text-white mb-2" style={{ fontSize: '10px' }}>JOIN A ROOM</div>
                  <div className="font-mono text-gray-400 text-sm mb-6">
                    Enter the room code your friend shared with you.
                  </div>
                  <input
                    className="w-full bg-black font-pixel text-center text-white px-4 py-3 mb-4 rounded outline-none tracking-widest"
                    style={{ border: '2px solid #2a0050', fontSize: '14px', letterSpacing: '4px' }}
                    placeholder="GMF-XXX"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 7))}
                    onFocus={e => (e.target.style.borderColor = '#ff00ff')}
                    onBlur={e => (e.target.style.borderColor = '#2a0050')}
                    onKeyDown={e => e.key === 'Enter' && joinRoom()}
                  />
                  <button
                    onClick={joinRoom}
                    disabled={joinCode.trim().length < 3}
                    className="w-full font-pixel py-4 text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #ff00ff20, #bf00ff20)', border: '2px solid #ff00ff', color: '#ff00ff' }}
                  >
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

        <button
          onClick={() => setScreen('login')}
          className="mt-4 font-mono text-gray-600 hover:text-gray-400 text-sm w-full text-center"
        >
          ← Change Fighter
        </button>
      </div>
    </div>
  );
}
