import { create } from 'zustand';
import { Fighter, GameScreen, GameMode, MatchResult, MatchMode } from '../types';
import { PlayerProfile, MatchReward } from '../utils/playerProfile';

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
  xAccessToken: string | null;
  oauthError: string;
  walletAddress: string | null;
  playerProfile: PlayerProfile | null;
  lastMatchReward: MatchReward | null;
  matchId: string | null;
  isHost: boolean;
  autoMatchmake: boolean;

  setScreen: (screen: GameScreen) => void;
  setMode: (mode: GameMode) => void;
  setMatchMode: (matchMode: MatchMode) => void;
  setPlayer1: (fighter: Fighter) => void;
  setPlayer2: (fighter: Fighter) => void;
  setMatchResult: (result: MatchResult) => void;
  setRoomCode: (code: string) => void;
  setOnlinePlayers: (n: number) => void;
  setActiveMatches: (n: number) => void;
  setXAccessToken: (token: string | null) => void;
  setOauthError: (err: string) => void;
  setWalletAddress: (addr: string | null) => void;
  setPlayerProfile: (p: PlayerProfile | null) => void;
  setLastMatchReward: (r: MatchReward | null) => void;
  setMatchId: (id: string | null) => void;
  setIsHost: (v: boolean) => void;
  setAutoMatchmake: (v: boolean) => void;
  rematch: () => void;
  resetMatch: () => void;
  logout: () => void;
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
  xAccessToken: null,
  oauthError: '',
  walletAddress: null,
  playerProfile: null,
  lastMatchReward: null,
  matchId: null,
  isHost: false,
  autoMatchmake: false,

  setScreen: (screen) => set({ screen }),
  setMode: (mode) => set({ mode }),
  setMatchMode: (matchMode) => set({ matchMode }),
  setPlayer1: (fighter) => set({ player1: fighter }),
  setPlayer2: (fighter) => set({ player2: fighter }),
  setMatchResult: (result) => set({ matchResult: result }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setOnlinePlayers: (onlinePlayers) => set({ onlinePlayers }),
  setActiveMatches: (activeMatches) => set({ activeMatches }),
  setXAccessToken: (xAccessToken) => set({ xAccessToken }),
  setOauthError: (oauthError) => set({ oauthError }),
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setPlayerProfile: (playerProfile) => set({ playerProfile }),
  setLastMatchReward: (lastMatchReward) => set({ lastMatchReward }),
  setMatchId: (matchId) => set({ matchId }),
  setIsHost: (isHost) => set({ isHost }),
  setAutoMatchmake: (autoMatchmake) => set({ autoMatchmake }),
  rematch: () => set({ matchResult: null, matchId: null, isHost: false, lastMatchReward: null }),
  resetMatch: () => set({
    player1: null, player2: null, matchResult: null,
    matchId: null, isHost: false, screen: 'mode_select',
  }),
  logout: () => set({
    player1: null, player2: null, xAccessToken: null, playerProfile: null,
    matchResult: null, matchId: null, isHost: false, screen: 'landing',
  }),
}));
