import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PackedDailySet } from "@/lib/game-pack";

export type RoundScores = {
  guesstimate?: number;
  warmup?: number;
  gk?: number[];
  wordplay?: number;
  judgment?: number;
};

export type NewBadge = { id: string; name: string; description: string };

type GameState = {
  date: string | null;
  pack: PackedDailySet | null;
  roundIndex: number;
  roundScores: RoundScores;
  newBadges: NewBadge[];
  setPack: (date: string, pack: PackedDailySet) => void;
  setRoundScore: (key: keyof RoundScores, score: number, gkIndex?: number) => void;
  setGkScores: (scores: number[]) => void;
  setNewBadges: (badges: NewBadge[]) => void;
  nextRound: () => void;
  totalScore: () => number;
  reset: () => void;
};

const initial = {
  date: null,
  pack: null,
  roundIndex: 0,
  roundScores: {} as RoundScores,
  newBadges: [] as NewBadge[],
};

export const useGameStore = create<GameState>()(
  immer((set, get) => ({
    ...initial,
    setPack: (date, pack) =>
      set((s) => {
        s.date = date;
        s.pack = pack;
        s.roundIndex = 0;
        s.roundScores = {};
        s.newBadges = [];
      }),
    setNewBadges: (badges) =>
      set((s) => {
        s.newBadges = badges;
      }),
    setRoundScore: (key, score, gkIndex) =>
      set((s) => {
        if (key === "gk") {
          if (gkIndex !== undefined) {
            const arr = [...(s.roundScores.gk ?? [])];
            arr[gkIndex] = score;
            s.roundScores.gk = arr.slice(0, 3);
          } else {
            s.roundScores.gk = [score];
          }
        } else {
          s.roundScores[key] = score;
        }
      }),
    setGkScores: (scores) =>
      set((s) => {
        s.roundScores.gk = scores;
      }),
    nextRound: () =>
      set((s) => {
        s.roundIndex += 1;
      }),
    totalScore: () => {
      const rs = get().roundScores;
      let t = 0;
      if (rs.guesstimate) t += rs.guesstimate;
      if (rs.warmup) t += rs.warmup;
      if (rs.gk?.length) t += rs.gk.reduce((a, b) => a + b, 0);
      if (rs.wordplay) t += rs.wordplay;
      if (rs.judgment) t += rs.judgment;
      return t;
    },
    reset: () => set(initial),
  })),
);
