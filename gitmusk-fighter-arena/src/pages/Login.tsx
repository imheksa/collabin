import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES, generateCustomProfile } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { Fighter, XProfile } from '../types';
import { OAUTH_ENABLED, X_CLIENT_ID, REDIRECT_URI } from '../config';
import { startXOAuth } from '../utils/oauth';

function ProfileRow({ profile, onSelect }: { profile: XProfile; onSelect: (p: XProfile) => void }) {
  const stats = calculateFighterStats(profile);
  const fmtFollow = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <button
      onClick={() => onSelect(profile)}
      className="w-full flex items-center gap-3 p-3 transition-all hover:-translate-y-px"
      style={{ background: 'var(--void-2)', border: '3px solid var(--panel-line)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = stats.color)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--panel-line)')}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 overflow-hidden" style={{ border: `2px solid ${stats.color}60` }}>
          <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.username}`; }} />
        </div>
        {profile.verified !== 'none' && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center"
            style={{ background: profile.verified === 'gold' ? '#ffd700' : '#1d9bf0', fontSize: '8px', color: '#000' }}>✓</div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: '#fff', marginBottom: '2px' }}>{profile.displayName}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--txt-dim)' }}>@{profile.username}</div>
      </div>
      <div className="text-right flex-shrink-0 flex flex-col gap-1">
        <div className="g-tag yel" style={{ fontSize: '7px', padding: '2px 6px' }}>{stats.archetypeLabel}</div>
        <div style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-yel)' }}>PWR {stats.basePower}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)' }}>{fmtFollow(profile.followers)} followers</div>
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
      const fighter: Fighter = { profile, stats: calculateFighterStats(profile) };
      setPlayer1(fighter);
      setScreen('mode_select');
      setLoading(false);
    }, 500);
  };

  const handleCustom = () => {
    if (!customUsername.trim()) return;
    selectProfile(generateCustomProfile(customUsername.trim().replace('@', '')));
  };

  const handleConnectX = async () => {
    if (!X_CLIENT_ID) return;
    setOauthLoading(true);
    setOauthError('');
    try { await startXOAuth(X_CLIENT_ID, REDIRECT_URI); }
    catch { setOauthError('Failed to start X login. Please try again.'); setOauthLoading(false); }
  };

  return (
    <div className="gscreen flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">

        {/* Nav */}
        <div className="g-nav mb-0" style={{ position: 'relative', marginBottom: '32px' }}>
          <div className="g-nav logo">
            <div className="badge">X</div>
            FIGHTER ARENA
          </div>
          <button onClick={() => setScreen('landing')}
            className="g-btn ghost sm">← BACK</button>
        </div>

        {/* Progress strip */}
        <div className="flex gap-0 mb-8" style={{ border: '3px solid var(--panel-line)' }}>
          {[['SELECT FIGHTER', true], ['CHOOSE MODE', false], ['FIGHT!', false]].map(([label, active]) => (
            <div key={label as string} className="flex-1 py-2 text-center"
              style={{
                fontFamily: 'var(--pixel)', fontSize: '7px',
                background: active ? 'var(--neon-b)' : 'var(--void-2)',
                color: active ? 'var(--void)' : 'var(--txt-dim)',
                letterSpacing: '.1em',
              }}>
              {label as string}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <span className="g-eyebrow">// PLAYER 1</span>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '20px', color: '#fff', textShadow: '3px 3px 0 var(--neon-pink)' }}>
            SELECT YOUR FIGHTER
          </div>
          <div style={{ fontFamily: 'var(--body)', fontSize: '20px', color: 'var(--txt-dim)', marginTop: '8px' }}>
            Your X identity becomes your fighter stats
          </div>
        </div>

        {/* OAuth error */}
        {oauthError && (
          <div className="g-panel pink mb-5" style={{ padding: '16px' }}>
            <div className="corners"><i></i><i></i><i></i><i></i></div>
            <div className="flex items-start justify-between gap-2">
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--neon-pink)', marginBottom: '6px' }}>
                  ⚠ X LOGIN FAILED
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--txt-dim)', marginBottom: '8px' }}>
                  {oauthError.includes('access_denied')
                    ? 'Login was cancelled.'
                    : oauthError.includes('redirect_uri') || oauthError.includes('callback')
                    ? 'Redirect URI mismatch. The URI below must exactly match your X Developer Portal callback URL.'
                    : oauthError.includes('CORS') || oauthError.includes('proxy') || oauthError.includes('Failed to fetch')
                    ? 'Token exchange proxy unreachable. Check Vercel deployment and /api/token-exchange function.'
                    : oauthError.includes('invalid_client') || oauthError.includes('unauthorized_client')
                    ? 'Invalid client ID. Check VITE_X_CLIENT_ID in Vercel environment variables.'
                    : oauthError}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--txt-dim)', borderTop: '1px dashed var(--panel-line)', paddingTop: '6px' }}>
                  <span style={{ color: 'var(--neon-yel)' }}>redirect_uri:</span> {REDIRECT_URI}
                </div>
              </div>
              <button onClick={() => setOauthError('')}
                style={{ color: 'var(--txt-dim)', fontFamily: 'var(--pixel)', fontSize: '9px', flexShrink: 0 }}>✕</button>
            </div>
          </div>
        )}

        {/* X OAuth button */}
        {OAUTH_ENABLED ? (
          <button onClick={handleConnectX} disabled={oauthLoading}
            className="g-btn full mb-5" style={{ background: '#1d9bf0', color: '#fff', boxShadow: '0 4px 0 0 #0d5a8a, 0 4px 0 4px var(--void), 0 8px 0 4px #5a1a99', fontSize: '10px', gap: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {oauthLoading ? 'CONNECTING...' : 'CONNECT WITH X — REAL STATS'}
          </button>
        ) : (
          <div className="g-panel dark mb-5" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)' }}>
              SET VITE_X_CLIENT_ID TO ENABLE X LOGIN
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1" style={{ height: '2px', background: 'var(--panel-line)' }} />
          <span style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)' }}>OR DEMO MODE</span>
          <div className="flex-1" style={{ height: '2px', background: 'var(--panel-line)' }} />
        </div>

        {/* Quick Play */}
        <button onClick={() => selectProfile(DEMO_PROFILES[Math.floor(Math.random() * DEMO_PROFILES.length)])}
          className="g-btn grn full mb-5" style={{ fontSize: '11px' }}>
          ⚡ QUICK PLAY &nbsp;
          <span style={{ fontFamily: 'var(--body)', fontSize: '16px', color: '#005a33', fontWeight: 'normal', textTransform: 'none' }}>
            random fighter, instant start
          </span>
        </button>

        {/* Demo profiles */}
        <div className="mb-5">
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '8px', color: 'var(--txt-dim)', marginBottom: '12px', letterSpacing: '.15em' }}>
            — OR PICK A FIGHTER —
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_PROFILES.map(p => (
              <ProfileRow key={p.username} profile={p} onSelect={selectProfile} />
            ))}
          </div>
        </div>

        {/* Custom username */}
        <div className="g-panel dark" style={{ padding: '16px' }}>
          <button onClick={() => setShowCustom(v => !v)}
            style={{ fontFamily: 'var(--pixel)', fontSize: '9px', color: 'var(--neon-p)', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showCustom ? '▼' : '▶'} USE CUSTOM USERNAME
          </button>
          {showCustom && (
            <div className="flex gap-2 mt-3">
              <input
                style={{ flex: 1, background: 'var(--void)', border: '3px solid var(--panel-line)', fontFamily: 'var(--mono)', fontSize: '14px', color: '#fff', padding: '10px 14px', outline: 'none' }}
                placeholder="@username"
                value={customUsername}
                onChange={e => setCustomUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustom()}
                onFocus={e => (e.target.style.borderColor = 'var(--neon-p)')}
                onBlur={e => (e.target.style.borderColor = 'var(--panel-line)')}
              />
              <button onClick={handleCustom} className="g-btn sm">GO</button>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,1,24,.92)' }}>
          <div style={{ fontFamily: 'var(--pixel)', fontSize: '14px', color: 'var(--neon-b)', textShadow: '0 0 20px var(--neon-b)', animation: 'g-pulse 1s steps(2) infinite' }}>
            GENERATING FIGHTER...
          </div>
        </div>
      )}
    </div>
  );
}
