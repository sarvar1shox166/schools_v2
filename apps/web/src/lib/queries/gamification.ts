import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export type PuzzleSection = "mot1" | "mot2" | "mot3" | "mot4" | "mot5";

export interface Puzzle {
  id: string;
  fen: string;
  difficulty: "oson" | "orta" | "qiyin";
  xpReward: number;
  title?: string | null;
  section: PuzzleSection;
  createdByTeacher?: boolean;
  rating: number | null;
  attemptCount: number;
}

export interface MyPuzzle {
  id: string;
  fen: string;
  solution: string[];
  difficulty: "oson" | "orta" | "qiyin";
  xpReward: number;
  title: string | null;
  description: string | null;
  section: PuzzleSection;
  createdAt: string;
}

export interface PuzzleAnalytics {
  total: number;
  correct: number;
  attempts: { fullName: string; correct: boolean; attemptedAt: string }[];
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: { current: number; threshold: number };
}

export interface MyXp {
  xp: number;
  level: number;
  streak: number;
  elo: number;
  achievements: Achievement[];
}

export interface AttemptResult {
  correct: boolean;
  finished: boolean;
  fenAfter: string;
  movesRemaining?: number;
  xpAwarded?: number;
  xp?: number;
  level?: number;
  streak?: number;
  newAchievements?: { code: string; name: string; description: string; icon: string }[];
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: number;
  elo: number;
  wins: number;
}

export function useDailyPuzzle() {
  return useQuery({
    queryKey: ["dailyPuzzle"],
    queryFn: async () => (await api.get<Puzzle | null>("/puzzles/daily")).data,
  });
}

export function usePuzzles(section?: PuzzleSection) {
  return useQuery({
    queryKey: ["puzzles", section],
    queryFn: async () => (await api.get<Puzzle[]>("/puzzles", { params: section ? { section } : undefined })).data,
    enabled: !!section,
  });
}

// Bo'limlar endi yuz minglab-millionlab masalaga ega bo'lishi mumkin (to'liq
// Lichess mateIn1..5 importi) — shuning uchun butun ro'yxatni yuklash o'rniga
// har safar (bo'lim/qiyinlik o'zgarganda yoki "Keyingisi" bosilganda) serverdan
// FAQAT bitta tasodifiy masala so'raladi.
export function useFetchRandomPuzzle() {
  return useMutation({
    mutationFn: async ({ section, difficulty, excludeId }: {
      section: PuzzleSection; difficulty?: string; excludeId?: string;
    }) =>
      (await api.get<Puzzle>("/puzzles/random", {
        params: { section, difficulty: difficulty && difficulty !== "hammasi" ? difficulty : undefined, excludeId },
      })).data,
  });
}

export function usePuzzleSectionCounts() {
  return useQuery({
    queryKey: ["puzzleSectionCounts"],
    queryFn: async () => (await api.get<Record<string, number>>("/puzzles/section-counts")).data,
  });
}

export function useMyPuzzles() {
  return useQuery({
    queryKey: ["myPuzzles"],
    queryFn: async () => (await api.get<MyPuzzle[]>("/puzzles/mine")).data,
  });
}

export function useCreatePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fen: string;
      solution: string[];
      difficulty: "oson" | "orta" | "qiyin";
      xpReward: number;
      title?: string;
      description?: string;
      section: PuzzleSection;
    }) => (await api.post<{ id: string }>("/puzzles", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPuzzles"] });
      qc.invalidateQueries({ queryKey: ["puzzleSectionCounts"] });
    },
  });
}

export function useDeletePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/puzzles/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPuzzles"] }),
  });
}

export function usePuzzleAnalytics(id: string | null) {
  return useQuery({
    queryKey: ["puzzleAnalytics", id],
    queryFn: async () => (await api.get<PuzzleAnalytics>(`/puzzles/${id}/analytics`)).data,
    enabled: !!id,
  });
}

export function usePuzzleHint() {
  return useMutation({
    mutationFn: async ({ puzzleId, moveIndex, fen, movesRemaining }: {
      puzzleId: string; moveIndex?: number; fen?: string; movesRemaining?: number;
    }) =>
      (await api.get<{ from: string }>(`/puzzles/${puzzleId}/hint`, { params: { moveIndex, fen, movesRemaining } })).data,
  });
}

export function useRevealSolution() {
  return useMutation({
    mutationFn: async (puzzleId: string) =>
      (await api.get<{ fen: string; moves: string[] }>(`/puzzles/${puzzleId}/solution`)).data,
  });
}

export function useAttemptPuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ puzzleId, moveIndex, move, fen, movesRemaining }: {
      puzzleId: string; moveIndex?: number; move: string; fen?: string; movesRemaining?: number;
    }) =>
      (await api.post<AttemptResult>(`/puzzles/${puzzleId}/attempt`, { moveIndex, move, fen, movesRemaining })).data,
    onSuccess: (data) => {
      if (data.finished && data.correct) {
        qc.invalidateQueries({ queryKey: ["myXp"] });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
        qc.invalidateQueries({ queryKey: ["puzzleStats"] });
      }
    },
  });
}

export function useMyXp(enabled = true) {
  return useQuery({
    queryKey: ["myXp"],
    queryFn: async () => (await api.get<MyXp>("/me/xp")).data,
    enabled,
  });
}

export interface StreakState {
  streak: number;
  currentDay: number;
  claimedToday: boolean;
  claimedDays: number[];
}

export function useMyStreak() {
  return useQuery({
    queryKey: ["myStreak"],
    queryFn: async () => (await api.get<StreakState>("/me/streak")).data,
  });
}

export interface StreakClaimResult {
  cycleDay: number;
  xpAwarded: number;
  xp: number;
  level: number;
  streak: number;
  newAchievements: { code: string; name: string; description: string; icon: string }[];
}

export function useClaimStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<StreakClaimResult>("/me/streak/claim")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myStreak"] });
      qc.invalidateQueries({ queryKey: ["myXp"] });
    },
  });
}

export interface PuzzleStats {
  correct: number;
  incorrect: number;
  accuracyPct: number;
  byDifficulty: { difficulty: string; correct: number; total: number }[];
}

export function usePuzzleStats() {
  return useQuery({
    queryKey: ["puzzleStats"],
    queryFn: async () => (await api.get<PuzzleStats>("/me/puzzle-stats")).data,
  });
}

export function useLeaderboard(sortBy: "elo" | "xp" = "elo") {
  return useQuery({
    queryKey: ["leaderboard", sortBy],
    queryFn: async () => (await api.get<LeaderboardEntry[]>("/leaderboard", { params: { sortBy } })).data,
  });
}

export interface EloPoint { elo: number; recordedAt: string; }

export function useEloHistory() {
  return useQuery({
    queryKey: ["eloHistory"],
    queryFn: async () => (await api.get<EloPoint[]>("/me/elo-history")).data,
  });
}

export interface GameStats {
  wins: number; draws: number; losses: number; total: number;
  recent: { opponentName: string; result: "win"|"draw"|"loss"; eloChange: number; playedAt: string }[];
}

export function useGameStats() {
  return useQuery({
    queryKey: ["gameStats"],
    queryFn: async () => (await api.get<GameStats>("/me/game-stats")).data,
  });
}

export function useRecordGameResult() {
  const qc = useQueryClient();
  return useMutation({
    // opponentElo mijozdan qabul qilinmaydi — server difficulty/unbeatable'dan
    // o'zi hisoblaydi (aks holda mijoz soxta ELO yuborib reytingni oshirishi mumkin edi).
    mutationFn: async (payload: { opponentName: string; result: "win"|"draw"|"loss"; difficulty: number; unbeatable?: boolean }) =>
      (await api.post<{ newElo: number; eloChange: number }>("/pvp/game-result", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myXp"] });
      qc.invalidateQueries({ queryKey: ["eloHistory"] });
      qc.invalidateQueries({ queryKey: ["gameStats"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
