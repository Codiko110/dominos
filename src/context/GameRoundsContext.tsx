import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createId } from '@/utils/ids';
import { loadJSON, saveJSON } from '@/utils/storage';

export type GamePlayer = {
  id: string;
  name: string;
  color: string;
  score: number;
};

export type GameRound = {
  id: string;
  atISO: string;
  scoresByPlayerId: Record<string, number>;
};

export type GameStatus = 'playing' | 'finished';

export type GameState = {
  id: string;
  createdAtISO: string;
  status: GameStatus;
  targetScore: number;
  players: GamePlayer[];
  rounds: GameRound[];
  winnerPlayerIds?: string[];
};

export type GameHistoryItem = {
  id: string;
  createdAtISO: string;
  targetScore: number;
  players: Pick<GamePlayer, 'id' | 'name' | 'color'>[];
  rounds: Pick<GameRound, 'id' | 'atISO' | 'scoresByPlayerId'>[];
  finalScoresByPlayerId: Record<string, number>;
  winnerPlayerIds: string[];
};

type StartNewGameParams = {
  numPlayers: number;
  playerNames: string[];
  targetScore: number;
};

type GameRoundsContextValue = {
  ready: boolean;
  game: GameState | null;
  history: GameHistoryItem[];
  startNewGame: (params: StartNewGameParams) => Promise<void>;
  addRoundWithScore: (playerId: string, score: number) => Promise<void>;
  setRoundScore: (roundId: string, playerId: string, score: number) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  replay: () => Promise<void>;
  clearHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  getHistoryItem: (id: string) => GameHistoryItem | undefined;
};

const GameRoundsContext = createContext<GameRoundsContextValue | null>(null);

const CURRENT_GAME_KEY = 'current_game_v1';
const HISTORY_KEY = 'game_history_v1';
const HISTORY_MAX_ITEMS = 50;

const DEFAULT_PLAYER_COLORS = ['#E11D48', '#2563EB', '#16A34A', '#F59E0B'];

function toSafeScore(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function toSafeTargetScore(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 100;
  return Math.max(1, Math.floor(num));
}

function computeTotals(players: Pick<GamePlayer, 'id'>[], rounds: GameRound[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of players) totals[p.id] = 0;
  for (const r of rounds) {
    for (const [playerId, score] of Object.entries(r.scoresByPlayerId)) {
      totals[playerId] = (totals[playerId] ?? 0) + toSafeScore(score);
    }
  }
  return totals;
}

function computeWinnerPlayerIds(players: GamePlayer[], targetScore: number): string[] | undefined {
  if (players.length === 0) return undefined;
  const max = Math.max(...players.map((p) => p.score));
  if (max < targetScore) return undefined;
  return players.filter((p) => p.score === max).map((p) => p.id);
}

function toHistoryItem(game: GameState): GameHistoryItem {
  const finalScoresByPlayerId: Record<string, number> = {};
  for (const p of game.players) finalScoresByPlayerId[p.id] = p.score;
  return {
    id: game.id,
    createdAtISO: game.createdAtISO,
    targetScore: game.targetScore,
    players: game.players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    rounds: game.rounds.map((r) => ({ id: r.id, atISO: r.atISO, scoresByPlayerId: r.scoresByPlayerId })),
    finalScoresByPlayerId,
    winnerPlayerIds: game.winnerPlayerIds ?? [],
  };
}

export function GameRoundsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      const savedGame = await loadJSON<GameState | null>(CURRENT_GAME_KEY, null);
      const savedHistory = await loadJSON<GameHistoryItem[]>(HISTORY_KEY, []);
      setGame(savedGame);
      setHistory(Array.isArray(savedHistory) ? savedHistory : []);
      setReady(true);
    };
    loadAll();
  }, []);

  const historyById = useMemo(() => new Map(history.map((h) => [h.id, h])), [history]);

  const persistGame = async (next: GameState | null) => {
    setGame(next);
    await saveJSON(CURRENT_GAME_KEY, next);
  };

  const persistHistory = async (next: GameHistoryItem[]) => {
    const sliced = next.slice(0, HISTORY_MAX_ITEMS);
    setHistory(sliced);
    await saveJSON(HISTORY_KEY, sliced);
  };

  const finalizeIfNeeded = async (next: GameState): Promise<GameState> => {
    if (next.status === 'finished') return next;
    const winners = computeWinnerPlayerIds(next.players, next.targetScore);
    if (!winners || winners.length === 0) return next;

    const finished: GameState = { ...next, status: 'finished', winnerPlayerIds: winners };
    const item = toHistoryItem(finished);
    if (!historyById.has(item.id)) {
      await persistHistory([item, ...history]);
    }
    return finished;
  };

  const startNewGame = async (params: StartNewGameParams) => {
    const numPlayers = Math.min(4, Math.max(2, Math.floor(params.numPlayers)));
    const targetScore = toSafeTargetScore(params.targetScore);

    const players: GamePlayer[] = Array.from({ length: numPlayers }).map((_, idx) => ({
      id: createId('p'),
      name: (params.playerNames[idx] ?? `Player ${idx + 1}`).toString(),
      color: DEFAULT_PLAYER_COLORS[idx] ?? DEFAULT_PLAYER_COLORS[0]!,
      score: 0,
    }));

    const next: GameState = {
      id: createId('game'),
      createdAtISO: new Date().toISOString(),
      status: 'playing',
      targetScore,
      players,
      rounds: [],
    };

    await persistGame(next);
  };

  const addRoundWithScore = async (playerId: string, score: number) => {
    if (!game || game.status !== 'playing') return;
    const safeScore = toSafeScore(score);
    const scoresByPlayerId: Record<string, number> = {};
    for (const p of game.players) scoresByPlayerId[p.id] = 0;
    if (scoresByPlayerId[playerId] !== undefined) scoresByPlayerId[playerId] = safeScore;

    const nextRounds: GameRound[] = [
      ...game.rounds,
      { id: createId('round'), atISO: new Date().toISOString(), scoresByPlayerId },
    ];

    const totals = computeTotals(game.players, nextRounds);
    const nextPlayers = game.players.map((p) => ({ ...p, score: totals[p.id] ?? 0 }));
    const nextGameBase: GameState = { ...game, players: nextPlayers, rounds: nextRounds };
    const nextGame = await finalizeIfNeeded(nextGameBase);
    await persistGame(nextGame);
  };

  const setRoundScore = async (roundId: string, playerId: string, score: number) => {
    if (!game || game.status !== 'playing') return;
    const safeScore = toSafeScore(score);
    const nextRounds = game.rounds.map((r) => {
      if (r.id !== roundId) return r;
      return {
        ...r,
        scoresByPlayerId: {
          ...r.scoresByPlayerId,
          [playerId]: safeScore,
        },
      };
    });

    const totals = computeTotals(game.players, nextRounds);
    const nextPlayers = game.players.map((p) => ({ ...p, score: totals[p.id] ?? 0 }));
    const nextGameBase: GameState = { ...game, players: nextPlayers, rounds: nextRounds };
    const nextGame = await finalizeIfNeeded(nextGameBase);
    await persistGame(nextGame);
  };

  const deleteRound = async (roundId: string) => {
    if (!game || game.status !== 'playing') return;
    const nextRounds = game.rounds.filter((r) => r.id !== roundId);
    const totals = computeTotals(game.players, nextRounds);
    const nextPlayers = game.players.map((p) => ({ ...p, score: totals[p.id] ?? 0 }));
    await persistGame({ ...game, players: nextPlayers, rounds: nextRounds });
  };

  const replay = async () => {
    if (!game) return;
    const next: GameState = {
      id: createId('game'),
      createdAtISO: new Date().toISOString(),
      status: 'playing',
      targetScore: game.targetScore,
      players: game.players.map((p) => ({ ...p, score: 0 })),
      rounds: [],
    };
    await persistGame(next);
  };

  const clearHistory = async () => {
    await persistHistory([]);
  };

  const deleteHistoryItem = async (id: string) => {
    await persistHistory(history.filter((h) => h.id !== id));
  };

  const getHistoryItem = (id: string) => historyById.get(id);

  const value: GameRoundsContextValue = {
    ready,
    game,
    history,
    startNewGame,
    addRoundWithScore,
    setRoundScore,
    deleteRound,
    replay,
    clearHistory,
    deleteHistoryItem,
    getHistoryItem,
  };

  return <GameRoundsContext.Provider value={value}>{children}</GameRoundsContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameRoundsContext);
  if (!ctx) {
    throw new Error('useGame must be used inside GameRoundsProvider');
  }
  return ctx;
}
