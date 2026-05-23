import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES, generateCustomProfile } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { Fighter, XProfile } from '../types';
import { OAUTH_ENABLED, X_CLIENT_ID, REDIRECT_URI } from '../config';
import { startXOAuth } from '../utils/oauth';

function ProfileRow({ profile, onSelect }: { profile: XProfile; onSelect: (p: XProfile) => void }) {
  const stats = calculateFighterStats(profile);
  const tickColor = profile.verified === 'gold' ? '#ffd700' : profile.verified === 'blue' ? '#1d9bf0' : 'transparent';
  return (
    <button
      onClick={() => onSelect(profile)}
      className="w-full flex items-center gap-3 p-3 rounded transition-all hover:scale-[1.02]"
      style={{ background: '#12002a', border: '1px solid #2a0050' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = stats.color)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a0050')}
    >
      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0"
        style={{ border: `1px solid ${stats.color}40` }}>
        <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.username}`; }} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
          <span className="font-pixel text-white" style={{ fontSize: '9px' }}>{profile.displayName}</span>
          {profile.verified !== 'none' && (
            <span className="w-3 h-3 rounded-full inline-flex items-center justify-center"
              style={{ background: tickColor, color: '#000', fontSize: '8px' }}>✓</span>
          )}
          <span className="font-pixel px-1.5 py-0.5 rounded"
            style={{ fontSize: '6px', color: stats.color, border: `1px solid ${stats.color}40`, background: `${stats.color}12` }}>
            {stats.archetypeLabel}
          </span>
        </div>
        <div className="font-mono text-gray-500 text-xs">@{profile.username}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-pixel" style={{ fontSize: '10px', color: '#ffff00' }}>PWR {stats.basePower}</div>
        <div className="font-pixel mt-0.5" style={{ fontSize: '7px', color: '#555' }}>
          {profile.followers >= 1_000_000
            ? `${(profile.followers / 1_000_000).toFixed(1)}M`
            : profile.followers >= 1000
            ? `${(profile.followers / 1000).toFixed(0)}K`
            : profile.followers} followers
        </div>
      </div>
    </button>
  );
}

export function Login() {
  const { setPlayer1, setScreen, oauthError, setOauthError } = useGameStore();
  const [customUsername, setCustomUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const selectProfile = (profile: XProfile) => {
    setLoading(true);
    setOauthError('');
    setTimeout(() => {
      const stats = calculateFighterStats(profile);
      const fighter: Fighter = { profile, stats };
      setPlayer1(fighter);
      setScreen('mode_select');
      setLoading(false);
    }, 600);
  };

  const handleCustom = () => {
    if (!customUsername.trim()) return;
    const profile = generateCustomProfile(customUsername.trim().replace('@', ''));
    selectProfile(profile);
  };

  const handleConnectX = async () => {
    if (!X_CLIENT_ID) return;
    setOauthLoading(true);
    setOauthError('');
    try {
      await startXOAuth(X_CLIENT_ID, REDIRECT_URI);
    } catch {
      setOauthError('Failed to start X login. Please try again.');
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="font-pixel text-sm mb-1" style={{ color: '#00ffff', textShadow: '0 0 12px #00ffff' }}>
            PLAYER 1
          </div>
          <div className="font-pixel text-white text-lg" style={{ textShadow: '0 0 8px #fff' }}>
            SELECT YOUR FIGHTER
          </div>
          <div className="font-mono text-gray-400 text-sm mt-2">
            Your X identity becomes your fighter stats
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {['SELECT FIGHTER', 'CHOOSE MODE', 'FIGHT'].map((p, i) => (
            <div key={p} className="flex-1 h-1 rounded"
              style={{
                background: i === 0 ? '#00ffff' : '#2a0050',
                boxShadow: i === 0 ? '0 0 8px #00ffff' : 'none',
              }}
            />
          ))}
        </div>

        {/* OAuth error */}
        {oauthError && (
          <div className="mb-4 p-3 rounded font-mono text-xs"
            style={{ background: '#1a0010', border: '1px solid #ff004080', color: '#ff6080' }}>
            ⚠ {oauthError}
            <button onClick={() => setOauthError('')} className="ml-2 text-gray-500 hover:text-gray-300">✕</button>
          </div>
        )}

        {/* Real X OAuth — primary CTA */}
        {OAUTH_ENABLED ? (
          <button
            onClick={handleConnectX}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded mb-6 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: oauthLoading ? '#0a0a0a' : '#0f1923',
              border: '2px solid #1d9bf0',
              color: '#1d9bf0',
              boxShadow: '0 0 20px #1d9bf040, inset 0 0 20px #1d9bf010',
            }}
          >
            {/* X logo */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1d9bf0">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-pixel" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              {oauthLoading ? 'CONNECTING...' : 'CONNECT WITH X (REAL STATS)'}
            </span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-3 py-4 rounded mb-6 cursor-not-allowed"
            style={{
              background: '#080808',
              border: '2px solid #1a1a2e',
              color: '#333',
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#333">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <div className="text-left">
              <div className="font-pixel" style={{ fontSize: '9px', color: '#444' }}>
                CONNECT WITH X — CONFIGURE VITE_X_CLIENT_ID
              </div>
              <div className="font-mono mt-0.5" style={{ fontSize: '9px', color: '#333' }}>
                Register at developer.x.com → copy Client ID → set env var
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: '#1a0030' }} />
          <span className="font-pixel text-gray-600" style={{ fontSize: '8px' }}>OR DEMO MODE</span>
          <div className="flex-1 h-px" style={{ background: '#1a0030' }} />
        </div>

        {/* ⚡ Quick Play */}
        <button
          onClick={() => selectProfile(DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)])}
          className="w-full flex items-center justify-center gap-2 py-3 rounded mb-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: '#00ff4115', border: '2px solid #00ff41', color: '#00ff41', boxShadow: '0 0 12px #00ff4130' }}
        >
          <span className="font-pixel" style={{ fontSize: '11px' }}>⚡ QUICK PLAY</span>
          <span className="font-mono" style={{ fontSize: '9px', color: '#00aa2a' }}>— random fighter, instant start</span>
        </button>

        {/* Demo profiles */}
        <div className="space-y-2 mb-4">
          <div className="font-pixel text-gray-600 mb-2" style={{ fontSize: '8px' }}>
            OR PICK A FIGHTER:
          </div>
          {DEMO_PROFILES.map(p => (
            <ProfileRow key={p.username} profile={p} onSelect={selectProfile} />
          ))}
        </div>

        {/* Custom username */}
        <div className="p-3 rounded" style={{ background: '#12002a', border: '1px solid #2a0050' }}>
          <button
            onClick={() => setShowCustom(v => !v)}
            className="font-pixel text-white w-full text-left"
            style={{ fontSize: '9px', color: '#bf00ff' }}
          >
            {showCustom ? '▼' : '▶'} USE CUSTOM USERNAME
          </button>
          {showCustom && (
            <div className="flex gap-2 mt-3">
              <input
                className="flex-1 bg-black border font-mono text-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                style={{ border: '1px solid #2a0050' }}
                placeholder="@username"
                value={customUsername}
                onChange={e => setCustomUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustom()}
              />
              <button
                onClick={handleCustom}
                className="font-pixel px-4 py-2 text-xs"
                style={{ background: '#bf00ff', color: '#000' }}
              >
                GO
              </button>
            </div>
          )}
        </div>

        {/* Setup hint */}
        {!OAUTH_ENABLED && (
          <div className="mt-4 p-3 rounded font-mono text-xs"
            style={{ background: '#0d001a', border: '1px solid #1a0030', color: '#444' }}>
            <div className="font-pixel mb-1" style={{ fontSize: '8px', color: '#666' }}>
              HOW TO ENABLE REAL X LOGIN:
            </div>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Go to <span style={{ color: '#1d9bf0' }}>developer.x.com</span> → create app</li>
              <li>Enable OAuth 2.0 + PKCE, set type to "Web App"</li>
              <li>Add callback: <span style={{ color: '#00ffff' }}>https://imheksa.github.io/collabin/</span></li>
              <li>Copy Client ID → set <span style={{ color: '#ffff00' }}>VITE_X_CLIENT_ID</span> env var</li>
              <li>Deploy to Netlify/Vercel for token exchange proxy</li>
            </ol>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="font-pixel text-xl animate-pulse"
              style={{ color: '#00ffff', textShadow: '0 0 20px #00ffff' }}>
              GENERATING FIGHTER...
            </div>
          </div>
        )}

        <button
          onClick={() => setScreen('landing')}
          className="mt-4 font-mono text-gray-600 hover:text-gray-400 text-sm w-full text-center"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
