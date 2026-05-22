import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { DEMO_PROFILES, generateCustomProfile } from '../data/mockProfiles';
import { calculateFighterStats } from '../utils/statsCalculator';
import { Fighter, XProfile } from '../types';

function ProfileRow({ profile, onSelect }: { profile: XProfile; onSelect: (p: XProfile) => void }) {
  const tickColor = profile.verified === 'gold' ? '#ffd700' : profile.verified === 'blue' ? '#1d9bf0' : 'transparent';
  return (
    <button
      onClick={() => onSelect(profile)}
      className="w-full flex items-center gap-3 p-3 rounded transition-all hover:scale-[1.02]"
      style={{
        background: '#12002a',
        border: '1px solid #2a0050',
        boxShadow: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#bf00ff')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a0050')}
    >
      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0"
        style={{ border: '1px solid #2a0050' }}>
        <img
          src={profile.avatarUrl}
          alt={profile.username}
          className="w-full h-full object-cover"
          onError={e => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.username}`;
          }}
        />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-1">
          <span className="font-pixel text-white" style={{ fontSize: '9px' }}>{profile.displayName}</span>
          {profile.verified !== 'none' && (
            <span
              className="w-3 h-3 rounded-full inline-flex items-center justify-center text-xs font-bold"
              style={{ background: tickColor, color: '#000', fontSize: '8px' }}
            >
              ✓
            </span>
          )}
        </div>
        <div className="font-mono text-gray-400 text-xs">@{profile.username}</div>
      </div>
      <div className="text-right">
        <div className="font-pixel text-yellow-400" style={{ fontSize: '8px' }}>
          {profile.followers >= 1000000
            ? `${(profile.followers / 1000000).toFixed(1)}M`
            : profile.followers >= 1000
            ? `${(profile.followers / 1000).toFixed(0)}K`
            : profile.followers} followers
        </div>
        <div className="font-pixel mt-0.5" style={{ fontSize: '8px', color: '#bf00ff' }}>
          Score: {profile.twitterScore}
        </div>
      </div>
    </button>
  );
}

export function Login() {
  const { setPlayer1, setPlayer2, setScreen, player1 } = useGameStore();
  const [step, setStep] = useState<'p1' | 'p2'>(player1 ? 'p2' : 'p1');
  const [customUsername, setCustomUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const selectProfile = (profile: XProfile) => {
    setLoading(true);
    setTimeout(() => {
      const stats = calculateFighterStats(profile);
      const fighter: Fighter = { profile, stats };
      if (step === 'p1') {
        setPlayer1(fighter);
        setStep('p2');
      } else {
        setPlayer2(fighter);
        setScreen('vs_screen');
      }
      setLoading(false);
      setShowCustom(false);
      setCustomUsername('');
    }, 600);
  };

  const handleCustom = () => {
    if (!customUsername.trim()) return;
    const profile = generateCustomProfile(customUsername.trim().replace('@', ''));
    selectProfile(profile);
  };

  const isP1Step = step === 'p1';
  const color = isP1Step ? '#00ffff' : '#ff00ff';
  const playerLabel = isP1Step ? 'PLAYER 1' : 'PLAYER 2';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="font-pixel text-sm mb-1"
            style={{ color, textShadow: `0 0 12px ${color}` }}
          >
            {playerLabel}
          </div>
          <div className="font-pixel text-white text-lg" style={{ textShadow: '0 0 8px #fff' }}>
            SELECT YOUR FIGHTER
          </div>
          <div className="font-mono text-gray-400 text-sm mt-2">
            Choose an X profile to generate your fighter
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {['P1', 'P2'].map((p, i) => (
            <div
              key={p}
              className="flex-1 h-1 rounded"
              style={{
                background: (isP1Step ? i === 0 : i <= 1) ? color : '#2a0050',
                boxShadow: (isP1Step ? i === 0 : i <= 1) ? `0 0 8px ${color}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Demo profiles */}
        <div className="space-y-2 mb-4">
          <div className="font-pixel text-gray-500 mb-2" style={{ fontSize: '8px' }}>
            DEMO PROFILES — PICK ANY:
          </div>
          {DEMO_PROFILES.map(p => (
            <ProfileRow key={p.username} profile={p} onSelect={selectProfile} />
          ))}
        </div>

        {/* Custom username */}
        <div
          className="p-3 rounded"
          style={{ background: '#12002a', border: '1px solid #2a0050' }}
        >
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
                style={{
                  background: '#bf00ff',
                  color: '#000',
                }}
              >
                GO
              </button>
            </div>
          )}
        </div>

        {/* Real X OAuth note */}
        <div
          className="mt-4 p-3 rounded font-mono text-xs text-gray-500"
          style={{ background: '#0d001a', border: '1px solid #1a0030' }}
        >
          🔒 Real X OAuth coming soon — connect your actual account to unlock live stats, true ranking, and P2E mode.
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="font-pixel text-xl" style={{ color, textShadow: `0 0 20px ${color}` }}>
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
