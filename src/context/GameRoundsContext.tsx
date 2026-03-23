import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { playerPalette } from '@/theme/theme';
import { loadJSON, saveJSON } from '@/utils/storage';
import { createId } from '@/utils/ids';

export type Player = {
  id: string;
  name: string;
  score: number; // total score (computed from rounds)
  color: string;
};

export type Round = {
  id: string;
  atISO: string;
  // Round-specific score delta per player (not cumulative totals).
  scoresByPlayerId: Record<string, number>;
};

export type GameStatus = 'in_progress' | 'finished';

export type GameState = {
  status: GameStatus;
  numPlayers: number;
  targetScore: number;
  players: Player[];
  rounds: Round[];
  finishedAtISO?: string;
  winnerPlayerIds?: string[];
};

export type HistoryPlayerSnapshot = {
  id: string;
  name: string;
  color: string;
};

export type GameHistoryItem = {
  id: string;
  createdAtISO: string;
  targetScore: number;
  numPlayers: number;
  players: HistoryPlayerSnapshot[];
  winnerPlayerIds: string[];
  rounds: Round[];
  finalScoresByPlayerId: Record<string, number>;
};

type StartGameConfig = {
  numPlayers: number;
  playerNames: (string | null | undefined)[];
  targetScore: number;
};

type GameRoundsContextValue = {
  ready: boolean;
  history: GameHistoryItem[];
  game: GameState | null;

  startNewGame: (config: StartGameConfig) => Promise<void>;
  replay: () => Promise<void>;

  addRound: () => Promise<void>;
  addRoundWithScore: (playerId: string, score: number) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  setRoundScore: (roundId: string, playerId: string, score: number) => Promise<void>;

  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getHistoryItem: (id: string) => GameHistoryItem | undefined;
};

const GameRoundsContext = createContext<GameRoundsContextValue | null>(null);

const HISTORY_KEY = 'dominos:history';

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  const floored = Math.floor(n);
  return Math.max(0, floored);
}

function computeFinalScoresByPlayerId(players: HistoryPlayerSnapshot[], rounds: Round[]) {
  const totals: Record<string, number> = {};
  for (const p of players) totals[p.id] = 0;
  for (const r of rounds) {
    for (const p of players) {
      totals[p.id] = (totals[p.id] ?? 0) + clampScore(r.scoresByPlayerId[p.id] ?? 0);
    }
  }
  return totals;
}

function computeWinnerPlayerIdsFromTotals(totals: Record<string, number>) {
  const ids = Object.keys(totals);
  if (ids.length === 0) return [];
  const maxScore = Math.max(...ids.map((id) => totals[id] ?? 0));
  return ids.filter((id) => (totals[id] ?? 0) === maxScore);
}

function buildPlayersFromConfig(config: StartGameConfig) {
  const safeNumPlayers = Math.max(2, Math.min(4, Math.floor(config.numPlayers)));
  const colors = [...playerPalette];

  const players: Player[] = Array.from({ length: safeNumPlayers }).map((_, idx) => {
    const nameRaw = config.playerNames[idx];
    const name = (nameRaw ?? '').toString().trim();
    return {
      id: createId(`p${idx + 1}`),
      name: name.length > 0 ? name : `Joueur ${idx + 1}`,
      score: 0,
      color: colors[idx % colors.length],
    };
  });

  return { safeNumPlayers, players };
}

function recomputeTotals(players: Player[], rounds: Round[]) {
  const nextPlayers = players.map((p) => ({ ...p, score: 0 }));
  const totals: Record<string, number> = Object.fromEntries(nextPlayers.map((p) => [p.id, 0]));

  for (const r of rounds) {
    for (const p of nextPlayers) {
      totals[p.id] = (totals[p.id] ?? 0) + clampScore(r.scoresByPlayerId[p.id] ?? 0);
    }
  }

  return nextPlayers.map((p) => ({ ...p, score: totals[p.id] ?? 0 }));
}

export function GameRoundsProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);

  const persistRef = useRef({ saving: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadJSON<GameHistoryItem[]>(HISTORY_KEY, []);
      if (!mounted) return;
      setHistory(Array.isArray(saved) ? saved : []);
      setHistoryReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistHistory = useCallback(async (nextHistory: GameHistoryItem[]) => {
    if (persistRef.current.saving) return;
    persistRef.current.saving = true;
    try {
      setHistory(nextHistory);
      await saveJSON(HISTORY_KEY, nextHistory);
    } finally {
      persistRef.current.saving = false;
    }
  }, []);

  const finishGameAndPersist = useCallback(
    async (currentGame: GameState) => {
      if (currentGame.status !== 'finished') return;

      const historyPlayers: HistoryPlayerSnapshot[] = currentGame.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
      }));

      const finalScoresByPlayerId = computeFinalScoresByPlayerId(historyPlayers, currentGame.rounds);
      const winnerPlayerIds = computeWinnerPlayerIdsFromTotals(finalScoresByPlayerId);

      const newItem: GameHistoryItem = {
        id: createId('game'),
        createdAtISO: currentGame.finishedAtISO ?? new Date().toISOString(),
        targetScore: currentGame.targetScore,
        numPlayers: currentGame.numPlayers,
        players: historyPlayers,
        winnerPlayerIds,
        rounds: currentGame.rounds,
        finalScoresByPlayerId,
      };

      const nextHistory = [newItem, ...history];
      await persistHistory(nextHistory);
    },
    [history, persistHistory]
  );

  // Persist exactly once per finished state
  const lastFinishedSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    const g = game;
    if (!g || g.status !== 'finished') return;

    const signature = `${g.finishedAtISO ?? ''}_${g.rounds.map((r) => r.id).join('|')}_${g.players
      .map((p) => `${p.id}:${p.score}`)
      .join('|')}`;

    if (lastFinishedSignatureRef.current === signature) return;
    lastFinishedSignatureRef.current = signature;

    void finishGameAndPersist(g);
  }, [game, finishGameAndPersist]);

  const startNewGame = useCallback(async ({ numPlayers, playerNames, targetScore }: StartGameConfig) => {
    const { safeNumPlayers, players } = buildPlayersFromConfig({ numPlayers, playerNames, targetScore });
    setGame({
      status: 'in_progress',
      numPlayers: safeNumPlayers,
      targetScore,
      players,
      rounds: [],
    });
  }, []);

  const addRound = useCallback(async () => {
    setGame((prev) => {
      if (!prev || prev.status !== 'in_progress') return prev;
      const round: Round = {
        id: createId('r'),
        atISO: new Date().toISOString(),
        scoresByPlayerId: Object.fromEntries(prev.players.map((p) => [p.id, 0])),
      };
      const nextRounds = [...prev.rounds, round];
      const nextPlayers = recomputeTotals(prev.players, nextRounds);
      return { ...prev, rounds: nextRounds, players: nextPlayers };
    });
  }, []);

  const addRoundWithScore = useCallback(async (playerId: string, score: number) => {
    setGame((prev) => {
      if (!prev || prev.status !== 'in_progress') return prev;

      const safeScore = clampScore(score);
      const scoresByPlayerId: Record<string, number> = Object.fromEntries(prev.players.map((p) => [p.id, 0]));
      scoresByPlayerId[playerId] = safeScore;

      const round: Round = {
        id: createId('r'),
        atISO: new Date().toISOString(),
        scoresByPlayerId,
      };

      const nextRounds = [...prev.rounds, round];
      const nextPlayers = recomputeTotals(prev.players, nextRounds);
      const shouldFinish = nextPlayers.some((p) => p.score >= prev.targetScore);

      if (shouldFinish) {
        const totals = Object.fromEntries(nextPlayers.map((p) => [p.id, p.score]));
        const winnerPlayerIds = computeWinnerPlayerIdsFromTotals(totals);
        return {
          ...prev,
          rounds: nextRounds,
          players: nextPlayers,
          status: 'finished',
          finishedAtISO: new Date().toISOString(),
          winnerPlayerIds,
        };
      }

      return { ...prev, rounds: nextRounds, players: nextPlayers };
    });
  }, []);

  const deleteRound = useCallback(async (roundId: string) => {
    setGame((prev) => {
      if (!prev || prev.status !== 'in_progress') return prev;
      const nextRounds = prev.rounds.filter((r) => r.id !== roundId);
      const nextPlayers = recomputeTotals(prev.players, nextRounds);
      return { ...prev, rounds: nextRounds, players: nextPlayers };
    });
  }, []);

  const setRoundScore = useCallback(
    async (roundId: string, playerId: string, score: number) => {
      setGame((prev) => {
        if (!prev || prev.status !== 'in_progress') return prev;
        const round = prev.rounds.find((r) => r.id === roundId);
        if (!round) return prev;

        const safeScore = clampScore(score);
        const nextRounds = prev.rounds.map((r) => {
          if (r.id !== roundId) return r;
          return {
            ...r,
            scoresByPlayerId: { ...r.scoresByPlayerId, [playerId]: safeScore },
          };
        });

        const nextPlayers = recomputeTotals(prev.players, nextRounds);
        const shouldFinish = nextPlayers.some((p) => p.score >= prev.targetScore);

        if (shouldFinish) {
          const totals = Object.fromEntries(nextPlayers.map((p) => [p.id, p.score]));
          const winnerPlayerIds = computeWinnerPlayerIdsFromTotals(totals);
          return {
            ...prev,
            rounds: nextRounds,
            players: nextPlayers,
            status: 'finished',
            finishedAtISO: new Date().toISOString(),
            winnerPlayerIds,
          };
        }

        return { ...prev, rounds: nextRounds, players: nextPlayers };
      });
    },
    []
  );

  const replay = useCallback(async () => {
    setGame((prev) => {
      if (!prev) return prev;
      return {
        status: 'in_progress',
        numPlayers: prev.numPlayers,
        targetScore: prev.targetScore,
        players: prev.players.map((p) => ({ ...p, score: 0 })),
        rounds: [],
      };
    });
  }, []);

  const deleteHistoryItem = useCallback(
    async (id: string) => {
      const next = history.filter((h) => h.id !== id);
      await persistHistory(next);
    },
    [history, persistHistory]
  );

  const clearHistory = useCallback(async () => {
    await persistHistory([]);
  }, [persistHistory]);

  const getHistoryItem = useCallback(
    (id: string) => history.find((h) => h.id === id),
    [history]
  );

  const value = useMemo<GameRoundsContextValue>(
    () => ({
      ready: historyReady,
      history,
      game,
      startNewGame,
      replay,
      addRound,
      addRoundWithScore,
      deleteRound,
      setRoundScore,
      deleteHistoryItem,
      clearHistory,
      getHistoryItem,
    }),
    [
      historyReady,
      history,
      game,
      startNewGame,
      replay,
      addRound,
      addRoundWithScore,
      deleteRound,
      setRoundScore,
      deleteHistoryItem,
      clearHistory,
      getHistoryItem,
    ]
  );

  return <GameRoundsContext.Provider value={value}>{children}</GameRoundsContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameRoundsContext);
  if (!ctx) throw new Error('useGame must be used inside GameRoundsProvider');
  return ctx;
}

