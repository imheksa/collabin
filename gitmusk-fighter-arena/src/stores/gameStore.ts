import { create } from 'zustand';
import { Fighter, GameScreen, GameMode, MatchResult } from '../types';

interface GameStore {
  screen: GameScreen;
  mode: GameMode;
  player1: Fighter | null;
  player2: Fighter | null;
  matchResult: MatchResult | null;

  setScreen: (screen: GameScreen) => void;
  setMode: (mode: GameMode) => void;
  setPlayer1: (fighter: Fighter) => void;
  setPlayer2: (fighter: Fighter) => void;
  setMatchResult: (result: MatchResult) => void;
  resetMatch: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  screen: 'landing',
  mode: 'free',
  player1: null,
  player2: null,
  matchResult: null,

  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode }),
  setPlayer1: (fighter) => set({ player1: fighter }),
  setPlayer2: (fighter) => set({ player2: fighter }),
  setMatchResult: (result) => set({ matchResult: result }),
  resetMatch: () => set({ player1: null, player2: null, matchResult: null, screen: 'login' }),
}));
