import { create } from 'zustand';
import { Fighter, GameScreen, GameMode, MatchResult, MatchMode } from '../types';

interface GameStore {
  screen: GameScreen;
  mode: GameMode;
  matchMode: MatchMode;
  player1: Fighter | null;
  player2: Fighter | null;
  matchResult: MatchResult | null;
  roomCode: string;
  onlinePlayers: number;
  activeMatches: number;

  setScreen: (screen: GameScreen) => void;
  setMode: (mode: GameMode) => void;
  setMatchMode: (matchMode: MatchMode) => void;
  setPlayer1: (fighter: Fighter) => void;
  setPlayer2: (fighter: Fighter) => void;
  setMatchResult: (result: MatchResult) => void;
  setRoomCode: (code: string) => void;
  setOnlinePlayers: (n: number) => void;
  setActiveMatches: (n: number) => void;
  resetMatch: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  screen: 'landing',
  mode: 'free',
  matchMode: 'random',
  player1: null,
  player2: null,
  matchResult: null,
  roomCode: '',
  onlinePlayers: 214,
  activeMatches: 18,

  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode }),
  setMatchMode: (matchMode) => set({ matchMode }),
  setPlayer1: (fighter) => set({ player1: fighter }),
  setPlayer2: (fighter) => set({ player2: fighter }),
  setMatchResult: (result) => set({ matchResult: result }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setOnlinePlayers: (onlinePlayers) => set({ onlinePlayers }),
  setActiveMatches: (activeMatches) => set({ activeMatches }),
  resetMatch: () => set({ player1: null, player2: null, matchResult: null, screen: 'mode_select' }),
}));
