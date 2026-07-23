import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import type { Teacher } from "./core.js";

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await api.get<Teacher[]>("/teachers")).data,
  });
}

export interface TeacherRanking {
  id: string;
  fullName: string;
  spec: string | null;
  groupsCount: number;
  studentsCount: number;
  avgRating: number | null;
  reviewCount: number;
}

export interface TeacherReview {
  id: string;
  rating: number;
  comment: string | null;
  period: string;
  createdAt: string;
  teacherName: string;
  reviewerName: string;
}

export function useTeacherRankings() {
  return useQuery({
    queryKey: ["teacherRankings"],
    queryFn: async () => (await api.get<TeacherRanking[]>("/teachers/rankings")).data,
  });
}

export function useTeacherReviews() {
  return useQuery({
    queryKey: ["teacherReviews"],
    queryFn: async () => (await api.get<TeacherReview[]>("/teachers/reviews")).data,
  });
}

export function useAddTeacherReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, ...payload }: { teacherId: string; rating: number; comment?: string }) =>
      (await api.post(`/teachers/${teacherId}/reviews`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacherRankings"] });
      qc.invalidateQueries({ queryKey: ["teacherReviews"] });
    },
  });
}

export function useDeleteTeacherReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teachers/reviews/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacherReviews"] }),
  });
}

export interface PendingLessonReview {
  lessonId: string;
  topic: string | null;
  conductedAt: string;
  teacherName: string;
}

export function usePendingLessonReviews() {
  return useQuery({
    queryKey: ["pendingLessonReviews"],
    queryFn: async () => (await api.get<PendingLessonReview[]>("/me/lessons/pending-reviews")).data,
    // WS push ("lessonEnded") invalidates this instantly when a lesson ends;
    // polling here is only a safety net for when the socket is down.
    refetchInterval: 60000,
  });
}

export function useSubmitLessonReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, ...payload }: { lessonId: string; rating: number; comment?: string }) =>
      (await api.post(`/lessons/${lessonId}/review`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendingLessonReviews"] }),
  });
}

export interface StudentTeacherReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  studentName: string;
  topic: string | null;
  conductedAt: string;
  moderationStatus: "pending" | "approved" | "rejected";
}

export function useStudentReviewsForTeacher(teacherId: string | null) {
  return useQuery({
    queryKey: ["studentReviews", teacherId],
    enabled: !!teacherId,
    queryFn: async () => (await api.get<StudentTeacherReview[]>(`/teachers/${teacherId}/student-reviews`)).data,
  });
}

export interface StudentLessonHistoryItem {
  lessonId: string;
  topic: string | null;
  conductedAt: string;
  teacherName: string;
  attendanceStatus: "p" | "a" | "l" | "ae";
  reason: string | null;
  rating: number | null;
  comment: string | null;
}

export function useStudentLessonHistory() {
  return useQuery({
    queryKey: ["studentLessonHistory"],
    queryFn: async () => (await api.get<StudentLessonHistoryItem[]>("/me/lessons/history")).data,
  });
}

export interface TeacherLessonReviewItem {
  studentName: string;
  rating: number;
  comment: string | null;
}

export interface TeacherLessonHistoryItem {
  lessonId: string;
  topic: string | null;
  conductedAt: string;
  groupName: string | null;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  avgRating: number | null;
  reviewCount: number;
  reviews: TeacherLessonReviewItem[];
}

export function useTeacherLessonHistory() {
  return useQuery({
    queryKey: ["teacherLessonHistory"],
    queryFn: async () => (await api.get<TeacherLessonHistoryItem[]>("/teachers/me/lessons/history")).data,
  });
}

export interface PendingModerationReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  studentName: string;
  teacherName: string;
  topic: string | null;
  conductedAt: string;
}

export function useModerationQueue() {
  return useQuery({
    queryKey: ["moderationQueue"],
    queryFn: async () => (await api.get<PendingModerationReview[]>("/moderator/lesson-reviews")).data,
  });
}

export function useApproveLessonReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/moderator/lesson-reviews/${id}/approve`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderationQueue"] }),
  });
}

export function useRejectLessonReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/moderator/lesson-reviews/${id}/reject`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderationQueue"] }),
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fullName: string; phone: string; spec?: string; title?: string; expYears?: number }) =>
      (await api.post("/teachers", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teachers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

