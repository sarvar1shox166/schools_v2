import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export type LearnCategory = "piece" | "principle" | "intermediate" | "advanced";

export interface LearnTopic {
  id: string;
  category: LearnCategory;
  pieceType: string | null;
  key: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  description: string | null;
  xpReward: number;
  sortOrder: number;
  bestLevel: number;
  totalLevels: number | null;
}

export interface LearnTopicLevel {
  levelNumber: number;
  stars: number | null;
  locked: boolean;
}

export interface LearnTopicDetail extends Omit<LearnTopic, "bestLevel" | "totalLevels"> {
  levels: LearnTopicLevel[];
}

export interface LearnLevelPlay {
  mode: "generated" | "fixed";
  pieceType: string;
  fen: string;
  from: string;
  to?: string;
  targets: string[];
  hintSquare: string | null;
  instruction: string;
  specialMove?: string | null;
}

export interface LearnCompleteResult {
  stars: number;
  xpAwarded?: number;
  xp?: number;
  level?: number;
  streak?: number;
  newAchievements?: { code: string; name: string; description: string; icon: string }[];
}

export function useLearnTopics(category?: LearnCategory) {
  return useQuery({
    queryKey: ["learn-topics", category],
    queryFn: async () => (await api.get<LearnTopic[]>("/learn/topics", { params: category ? { category } : {} })).data,
  });
}

export function useLearnTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ["learn-topic", topicId],
    enabled: !!topicId,
    queryFn: async () => (await api.get<LearnTopicDetail>(`/learn/topics/${topicId}`)).data,
  });
}

export function usePlayLearnLevel(topicId: string | undefined, levelNumber: number | undefined) {
  return useQuery({
    queryKey: ["learn-play", topicId, levelNumber],
    enabled: !!topicId && !!levelNumber,
    queryFn: async () => (await api.get<LearnLevelPlay>(`/learn/topics/${topicId}/levels/${levelNumber}/play`)).data,
  });
}

export function useCompleteLearnLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ topicId, levelNumber, mistakes }: { topicId: string; levelNumber: number; mistakes: number }) =>
      (await api.post<LearnCompleteResult>(`/learn/topics/${topicId}/levels/${levelNumber}/complete`, { mistakes })).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["learn-topics"] });
      qc.invalidateQueries({ queryKey: ["learn-topic", vars.topicId] });
    },
  });
}
