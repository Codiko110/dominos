import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppTheme } from '@/theme/theme';
import { playerPalette, getThemeColors } from '@/theme/theme';
import { loadJSON, saveJSON } from '@/utils/storage';
import { createId } from '@/utils/ids';

export type Player = {
  id: string;
  name: string;
  score: number;
  color: string;
};

export type ScoreHistoryAction = 'start' | 'add' | 'set' | 'next';

export type ScoreHistoryEntry = {
  id: string;
  atISO: string;
  action: ScoreHistoryAction;
  activePlayerId: string;
  affectedPlayerId?: string;
  delta?: number;
  value?: number;
  scoresByPlayerId: Record<string, number>;
};

export type GameStatus = 'in_progress' | 'finished';

export type GameState = {
  status: GameStatus;
  numPlayers: number;
  targetScore: number;
  players: Player[];
  activePlayerIndex: number;
  scoreHistory: ScoreHistoryEntry[];
  finishedAtISO?: string;
  winnerPlayerIds?: string[];
};

export type HistoryPlayerSnapshot = {
  id: string;
  name: string;
  score: number;
  color: string;
};

export type GameHistoryItem = {
  id: string;
  createdAtISO: string;
  targetScore: number;
  numPlayers: number;
  players: HistoryPlayerSnapshot[];
  winnerPlayerIds: string[];
  scoreHistory: ScoreHistoryEntry[];
};

type StartGameConfig = {
  numPlayers: number;
  playerNames: (string | null | undefined)[];
  targetScore: number;
};

type GameContextValue = {
  ready: boolean;
  history: GameHistoryItem[];
  game: GameState | null;

  startNewGame: (config: StartGameConfig) => Promise<void>;
  replay: () => Promise<void>;

  addScoreToActivePlayer: (delta: number) => Promise<void>;
  setScoreForPlayer: (playerId: string, newScore: number) => Promise<void>;
  goToNextPlayer: () => Promise<void>;

  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getHistoryItem: (id: string) => GameHistoryItem | undefined;
};

const GameContext = createContext<GameContextValue | null>(null);

const HISTORY_KEY = 'dominos:history';

function snapshotScores(players: Player[]): Record<string, number> {
  return Object.fromEntries(players.map((p) => [p.id, p.score]));
}

function computeWinnerPlayerIds(players: Player[]): string[] {
  if (players.length === 0) return [];
  const maxScore = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === maxScore).map((p) => p.id);
}

export function GameProvider({ children }: { children: React.ReactNode }) {
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
    // Avoid overlapping writes when multiple actions happen quickly.
    if (persistRef.current.saving) return;
    persistRef.current.saving = true;
    try {
      setHistory(nextHistory);
      await saveJSON(HISTORY_KEY, nextHistory);
    } finally {
      persistRef.current.saving = false;
    }
  }, []);

  const startNewGame = useCallback(
    async ({ numPlayers, playerNames, targetScore }: StartGameConfig) => {
      const safeNumPlayers = Math.max(2, Math.min(4, Math.floor(numPlayers)));
      const colors = [...playerPalette];
      const players: Player[] = Array.from({ length: safeNumPlayers }).map((_, idx) => {
        const nameRaw = playerNames[idx];
        const name = (nameRaw ?? '').toString().trim();
        return {
          id: createId(`p${idx + 1}`),
          name: name.length > 0 ? name : `Joueur ${idx + 1}`,
          score: 0,
          color: colors[idx % colors.length],
        };
      });

      const activePlayerIndex = 0;
      const startEntry: ScoreHistoryEntry = {
        id: createId('h_start'),
        atISO: new Date().toISOString(),
        action: 'start',
        activePlayerId: players[activePlayerIndex].id,
        scoresByPlayerId: snapshotScores(players),
      };

      setGame({
        status: 'in_progress',
        numPlayers: safeNumPlayers,
        targetScore,
        players,
        activePlayerIndex,
        scoreHistory: [startEntry],
      });
    },
    []
  );

  const finishGameAndPersist = useCallback(
    async (currentGame: GameState) => {
      if (currentGame.status !== 'finished') return;

      const finishedPlayers = currentGame.players;
      const winnerPlayerIds = computeWinnerPlayerIds(finishedPlayers);
      const newItem: GameHistoryItem = {
        id: createId('game'),
        createdAtISO: currentGame.finishedAtISO ?? new Date().toISOString(),
        targetScore: currentGame.targetScore,
        numPlayers: currentGame.numPlayers,
        players: finishedPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          color: p.color,
        })),
        winnerPlayerIds,
        scoreHistory: currentGame.scoreHistory,
      };

      const nextHistory = [newItem, ...history];
      await persistHistory(nextHistory);
    },
    [history, persistHistory]
  );

  // Keep track of the latest game state to compute persistence correctly
  const latestGameRef = useRef<GameState | null>(null);
  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  // When game transitions to finished, persist exactly once per transition.
  const lastFinishedGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    const g = game;
    if (!g || g.status !== 'finished') return;

    const currentFinishedSignature = `${g.finishedAtISO ?? ''}_${g.players
      .map((p) => `${p.id}:${p.score}`)
      .join('|')}`;

    if (lastFinishedGameIdRef.current === currentFinishedSignature) return;
    lastFinishedGameIdRef.current = currentFinishedSignature;

    // Persist asynchronously; UI navigation does not need to block.
    void finishGameAndPersist(g);
  }, [game, finishGameAndPersist]);

  const addScoreToActivePlayer = useCallback(
    async (delta: number) => {
      if (!game || game.status !== 'in_progress') return;
      if (!Number.isFinite(delta)) return;
      if (delta < 0) return;

      const activeIdx = game.activePlayerIndex;
      const activePlayer = game.players[activeIdx];
      if (!activePlayer) return;

      const nextPlayers = game.players.map((p, idx) => {
        if (idx !== activeIdx) return p;
        return { ...p, score: p.score + delta };
      });

      const nextGame: GameState = {
        ...game,
        players: nextPlayers,
        scoreHistory: [
          ...game.scoreHistory,
          {
            id: createId('h_add'),
            atISO: new Date().toISOString(),
            action: 'add',
            activePlayerId: activePlayer.id,
            affectedPlayerId: activePlayer.id,
            delta,
            scoresByPlayerId: snapshotScores(nextPlayers),
          },
        ],
      };

      const shouldFinish = nextPlayers.some((p) => p.score >= game.targetScore);
      if (shouldFinish) {
        setGame({
          ...nextGame,
          status: 'finished',
          finishedAtISO: new Date().toISOString(),
          winnerPlayerIds: computeWinnerPlayerIds(nextPlayers),
        });
      } else {
        setGame(nextGame);
      }
    },
    [game]
  );

  const setScoreForPlayer = useCallback(
    async (playerId: string, newScore: number) => {
      if (!game || game.status !== 'in_progress') return;
      if (!Number.isFinite(newScore)) return;
      if (newScore < 0) return;

      const affectedIdx = game.players.findIndex((p) => p.id === playerId);
      if (affectedIdx === -1) return;

      const nextPlayers = game.players.map((p) => {
        if (p.id !== playerId) return p;
        return { ...p, score: Math.floor(newScore) };
      });

      const affectedPlayer = game.players[affectedIdx];

      const nextGame: GameState = {
        ...game,
        players: nextPlayers,
        scoreHistory: [
          ...game.scoreHistory,
          {
            id: createId('h_set'),
            atISO: new Date().toISOString(),
            action: 'set',
            activePlayerId: game.players[game.activePlayerIndex]?.id ?? playerId,
            affectedPlayerId: playerId,
            value: Math.floor(newScore),
            scoresByPlayerId: snapshotScores(nextPlayers),
          },
        ],
      };

      const shouldFinish = nextPlayers.some((p) => p.score >= game.targetScore);
      if (shouldFinish) {
        setGame({
          ...nextGame,
          status: 'finished',
          finishedAtISO: new Date().toISOString(),
          winnerPlayerIds: computeWinnerPlayerIds(nextPlayers),
        });
      } else {
        setGame(nextGame);
      }
    },
    [game]
  );

  const goToNextPlayer = useCallback(async () => {
    if (!game || game.status !== 'in_progress') return;
    const nextIdx = (game.activePlayerIndex + 1) % game.players.length;
    const activePlayerId = game.players[nextIdx]?.id;
    if (!activePlayerId) return;

    const nextGame: GameState = {
      ...game,
      activePlayerIndex: nextIdx,
      scoreHistory: [
        ...game.scoreHistory,
        {
          id: createId('h_next'),
          atISO: new Date().toISOString(),
          action: 'next',
          activePlayerId,
          scoresByPlayerId: snapshotScores(game.players),
        },
      ],
    };
    setGame(nextGame);
  }, [game]);

  const replay = useCallback(async () => {
    if (!game) return;
    // Reset scores but keep same players names and target.
    const colors = game.players.map((p) => p.color);
    const players: Player[] = game.players.map((p, idx) => ({
      ...p,
      score: 0,
      color: colors[idx] ?? p.color,
    }));
    const startEntry: ScoreHistoryEntry = {
      id: createId('h_start'),
      atISO: new Date().toISOString(),
      action: 'start',
      activePlayerId: players[0].id,
      scoresByPlayerId: snapshotScores(players),
    };
    setGame({
      status: 'in_progress',
      numPlayers: game.numPlayers,
      targetScore: game.targetScore,
      players,
      activePlayerIndex: 0,
      scoreHistory: [startEntry],
    });
  }, [game]);

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
    (id: string) => {
      return history.find((h) => h.id === id);
    },
    [history]
  );

  const value = useMemo<GameContextValue>(
    () => ({
      ready: historyReady,
      history,
      game,
      startNewGame,
      replay,
      addScoreToActivePlayer,
      setScoreForPlayer,
      goToNextPlayer,
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
      addScoreToActivePlayer,
      setScoreForPlayer,
      goToNextPlayer,
      deleteHistoryItem,
      clearHistory,
      getHistoryItem,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

