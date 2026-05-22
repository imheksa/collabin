import { useGameStore } from '../stores/gameStore';
import { FightingArena } from '../components/FightingArena';
import { MatchResult } from '../types';

export function Arena() {
  const { player1, player2, setMatchResult, setScreen } = useGameStore();

  if (!player1 || !player2) return null;

  const handleMatchEnd = (result: MatchResult) => {
    setMatchResult(result);
    setScreen('results');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arena-bg p-2 md:p-4">
      <div className="font-pixel text-center mb-3 text-xs"
        style={{ color: '#bf00ff', textShadow: '0 0 8px #bf00ff' }}>
        GITLAWB FIGHTER ARENA · FREE MODE
      </div>
      <FightingArena
        player1={player1}
        player2={player2}
        onMatchEnd={handleMatchEnd}
      />
    </div>
  );
}
