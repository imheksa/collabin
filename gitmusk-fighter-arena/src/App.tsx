import { useEffect, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { CRTOverlay } from './components/CRTOverlay';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { ModeSelect } from './pages/ModeSelect';
import { VSScreen } from './pages/VSScreen';
import { Arena } from './pages/Arena';
import { Results } from './pages/Results';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { X_CLIENT_ID, REDIRECT_URI } from './config';
import { exchangeCodeForToken, fetchXProfile } from './utils/xApiClient';
import { calculateFighterStats } from './utils/statsCalculator';
import { restoreProfileFromCloud } from './utils/cloudSync';
import { Fighter } from './types';

export default function App() {
  const { screen, setScreen, setPlayer1, setXAccessToken, setOauthError, setPlayerProfile, player1, setPlayer2, setMatchId, setIsHost } = useGameStore();
  const [oauthProcessing, setOauthProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const errorParam = params.get('error');
    const joinId = params.get('join');

    if (errorParam) {
      window.history.replaceState({}, '', window.location.pathname);
      setOauthError('X login was cancelled.');
      setScreen('login');
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
      return;
    }

    if (joinId) {
      window.history.replaceState({}, '', window.location.pathname);
      sessionStorage.setItem('pending_join', joinId);
    }
  }, []);

  // Handle pending room join after login
  useEffect(() => {
    const pendingJoin = sessionStorage.getItem('pending_join');
    if (!pendingJoin || !player1) return;
    sessionStorage.removeItem('pending_join');
    handleRoomJoin(pendingJoin);
  }, [player1]);

  async function handleRoomJoin(matchId: string) {
    if (!player1) return;
    try {
      const res = await fetch('/api/room-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          username: player1.profile.username,
          fighterData: { profile: player1.profile, stats: player1.stats },
        }),
      });
      if (!res.ok) { setScreen('mode_select'); return; }
      const data = await res.json();
      const opponent = data.player1Data as Fighter;
      setPlayer2(opponent);
      setMatchId(matchId);
      setIsHost(false);
      setScreen('vs_screen');
    } catch (err) {
      console.error('Room join error:', err);
      setScreen('mode_select');
    }
  }

  async function handleOAuthCallback(code: string, state: string) {
    const storedState = localStorage.getItem('oauth_state');
    const verifier = localStorage.getItem('oauth_code_verifier');

    window.history.replaceState({}, '', window.location.pathname);

    if (!storedState || state !== storedState || !verifier || !X_CLIENT_ID) {
      setOauthError('OAuth verification failed. Please try again.');
      setScreen('login');
      return;
    }

    setOauthProcessing(true);

    try {
      const token = await exchangeCodeForToken(code, verifier, X_CLIENT_ID, REDIRECT_URI);
      const profile = await fetchXProfile(token);
      const stats = calculateFighterStats(profile);
      const fighter: Fighter = { profile, stats };

      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_code_verifier');

      setXAccessToken(token);
      setPlayer1(fighter);
      restoreProfileFromCloud(profile.username).then(merged => { if (merged) setPlayerProfile(merged); });
      setScreen('mode_select');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'X login failed.';
      setOauthError(msg + ' You can still use demo mode below.');
      setScreen('login');
    } finally {
      setOauthProcessing(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-arena-bg font-mono">
      <CRTOverlay />

      {oauthProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
          <div className="font-pixel text-2xl mb-4 animate-pulse"
            style={{ color: '#1d9bf0', textShadow: '0 0 20px #1d9bf0' }}>
            AUTHENTICATING WITH X...
          </div>
          <div className="flex gap-2 mt-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full animate-bounce"
                style={{ background: '#1d9bf0', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <div className="mt-6 font-mono text-gray-500 text-sm">Fetching your real stats...</div>
        </div>
      )}

      {screen === 'landing' && <Landing />}
      {screen === 'login' && <Login />}
      {screen === 'mode_select' && <ModeSelect />}
      {screen === 'vs_screen' && <VSScreen />}
      {screen === 'arena' && <Arena />}
      {screen === 'results' && <Results />}
      {screen === 'leaderboard' && <Leaderboard />}
      {screen === 'profile' && <Profile />}
    </div>
  );
}
