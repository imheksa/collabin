import { useGameStore } from '../stores/gameStore';
import { FightingArena } from '../components/FightingArena';
import { MatchResult } from '../types';

export function Arena() {
  const { player1, player2, setMatchResult, setScreen, matchId, isHost } = useGameStore();

  if (!player1 || !player2) return null;

  const p2pMode: 'host' | 'client' | null = matchId ? (isHost ? 'host' : 'client') : null;

  const handleMatchEnd = (result: MatchResult) => {
    setMatchResult(result);
    setScreen('results');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-0 sm:p-2 md:p-4"
      style={{ touchAction: 'none', userSelect: 'none' }}>
      <div className="font-pixel text-center mb-1 md:mb-3 text-xs pt-2"
        style={{ color: '#bf00ff', textShadow: '0 0 8px #bf00ff' }}>
        EX ARENA · {p2pMode ? 'P2P' : 'FREE'}
      </div>
      <FightingArena
        player1={player1}
        player2={player2}
        onMatchEnd={handleMatchEnd}
        p2AI={!p2pMode}
        p2pMode={p2pMode}
        matchId={matchId}
      />
    </div>
  );
}
