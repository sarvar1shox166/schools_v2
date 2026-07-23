import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export interface VideoCourse {
  id: string;
  title: string;
  category: "zoom" | "debyut" | "taktika" | "endshpil" | "strategiya";
  thumbnailUrl: string | null;
  thumbnailColor: string | null;
  thumbnailIcon: string | null;
  videoCount: number;
  testCount: number;
  watchedCount: number;
  lessonCompletionXp: number;
  courseCompletionXp: number;
}

export interface VideoLessonItem {
  id: string;
  title: string;
  videoUrl: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  progressPct: number;
  lessonDone: boolean;
  hasQuiz: boolean;
}

export interface VideoCourseExamStatus {
  questionCount: number;
  completed: boolean;
  allLessonsDone: boolean;
}

export interface VideoCourseDetail extends VideoCourse {
  lessons: VideoLessonItem[];
  exam?: VideoCourseExamStatus;
}

export function useVideoCourses(category?: string) {
  return useQuery({
    queryKey: ["video-courses", category],
    queryFn: async () => (await api.get<VideoCourse[]>("/video-courses", { params: category ? { category } : {} })).data,
  });
}

export function useVideoCourseDetail(courseId: string | undefined) {
  return useQuery({
    queryKey: ["video-course", courseId],
    enabled: !!courseId,
    queryFn: async () => (await api.get<VideoCourseDetail>(`/video-courses/${courseId}`)).data,
  });
}

export function useCreateVideoCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string; category: string;
      thumbnailUrl?: string; thumbnailColor?: string; thumbnailIcon?: string;
      lessonCompletionXp?: number; courseCompletionXp?: number;
    }) => (await api.post<{ id: string }>("/video-courses", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-courses"] }),
  });
}

export function useUpdateVideoCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; title?: string; category?: string;
      thumbnailUrl?: string; thumbnailColor?: string; thumbnailIcon?: string;
      lessonCompletionXp?: number; courseCompletionXp?: number;
    }) => (await api.patch(`/video-courses/${id}`, payload)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-courses"] });
      qc.invalidateQueries({ queryKey: ["video-course", vars.id] });
    },
  });
}

export function useDeleteVideoCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/video-courses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-courses"] }),
  });
}

export function useAddVideoLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, ...payload }: {
      courseId: string; title: string; videoUrl: string; durationSeconds?: number; thumbnailUrl?: string;
    }) => (await api.post<{ id: string }>(`/video-courses/${courseId}/videos`, payload)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
      qc.invalidateQueries({ queryKey: ["video-courses"] });
    },
  });
}

export function useUpdateVideoLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, ...payload }: {
      id: string; courseId: string; title?: string; videoUrl?: string; durationSeconds?: number; thumbnailUrl?: string;
    }) => (await api.patch(`/videos/${id}`, payload)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] }),
  });
}

export function useDeleteVideoLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; courseId: string }) => (await api.delete(`/videos/${id}`)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
      qc.invalidateQueries({ queryKey: ["video-courses"] });
    },
  });
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post<{ url: string }>("/videos/upload", form)).data;
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post<{ url: string }>("/upload/image", form)).data;
    },
  });
}

export function useUpdateVideoProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, progressPct }: { videoId: string; progressPct: number; courseId?: string }) =>
      (await api.post<{
        xp?: number; level?: number; streak?: number; xpAwarded?: number;
        lessonXpAwarded?: number; courseXpAwarded?: number;
      }>(`/videos/${videoId}/progress`, { progressPct })).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-courses"] });
      if (vars.courseId) qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
    },
  });
}

export interface VideoQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number; // present for admin/teacher only
}

export function useVideoQuiz(videoId: string | undefined) {
  return useQuery({
    queryKey: ["videoQuiz", videoId],
    enabled: !!videoId,
    queryFn: async () => (await api.get<VideoQuizQuestion[]>(`/videos/${videoId}/quiz`)).data,
  });
}

export function useAddQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, ...body }: { videoId: string; question: string; options: string[]; correctIndex: number }) =>
      (await api.post<{ id: string }>(`/videos/${videoId}/quiz`, body)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["videoQuiz", vars.videoId] }),
  });
}

export function useDeleteQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string; videoId: string }) =>
      (await api.delete(`/videos/quiz/${questionId}`)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["videoQuiz", vars.videoId] }),
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, answers, courseId }: { videoId: string; answers: number[]; courseId?: string }) =>
      (await api.post<{
        score: number; total: number; xpAwarded?: number;
        lessonXpAwarded?: number; courseXpAwarded?: number;
      }>(`/videos/${videoId}/quiz/submit`, { answers })).data,
    onSuccess: (_d, vars) => {
      if (vars.courseId) qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
    },
  });
}

export interface VideoCourseExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number; // faqat admin/teacher uchun
}

export function useCourseExam(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courseExam", courseId],
    enabled: !!courseId,
    queryFn: async () => (await api.get<VideoCourseExamQuestion[]>(`/video-courses/${courseId}/exam`)).data,
  });
}

export function useAddExamQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, ...body }: { courseId: string; question: string; options: string[]; correctIndex: number }) =>
      (await api.post<{ id: string }>(`/video-courses/${courseId}/exam`, body)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["courseExam", vars.courseId] }),
  });
}

export function useDeleteExamQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string; courseId: string }) =>
      (await api.delete(`/video-courses/exam/${questionId}`)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["courseExam", vars.courseId] }),
  });
}

export function useSubmitCourseExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, answers }: { courseId: string; answers: number[] }) =>
      (await api.post<{ score: number; total: number; courseXpAwarded?: number }>(`/video-courses/${courseId}/exam/submit`, { answers })).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] }),
  });
}

