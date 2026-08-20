import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export interface NextLesson {
  id: string;
  groupId: string | null;
  groupName: string | null;
  color: string | null;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  isOnline: boolean;
  meetingUrl: string | null;
  /** Dars o'ziga xos havolaga ega bo'lmasa, o'qituvchining standart havolasi. */
  teacherDefaultMeetingUrl?: string | null;
  meetingPlatform: "zoom" | "meet";
  lessonType?: "guruh" | "individual" | "diagnostika";
  customName?: string | null;
  teacherName: string | null;
  teacherPhone: string | null;
  nextAt: string;
  endsAt: string;
  isLive: boolean;
  // Dars jonli bo'lganda o'qituvchi haqiqatan "Darsga kirish"ni bosganmi —
  // bosmagan bo'lsa o'quvchi ham kira olmaydi (backend ham buni tekshiradi).
  teacherJoined: boolean;
  endedToday: boolean;
  teacherRating: number | null;
  teacherStudentsCount: number;
  isRescheduled: boolean;
}

export function useNextLesson() {
  return useQuery({
    queryKey: ["nextLesson"],
    queryFn: async () => (await api.get<NextLesson | null>("/me/schedule/next")).data,
  });
}

export interface CancelledLessonToday {
  groupName: string | null;
  customName: string | null;
  startTime: string;
}

export function useCancelledToday() {
  return useQuery({
    queryKey: ["cancelledToday"],
    queryFn: async () => (await api.get<CancelledLessonToday[]>("/me/schedule/cancelled-today")).data,
  });
}

export interface AttendanceHistory {
  records: { date: string; status: "p" | "a" | "l" }[];
  totals: { p: number; a: number; l: number };
  percent: number;
}

export function useAttendanceHistory() {
  return useQuery({
    queryKey: ["attendanceHistory"],
    queryFn: async () => (await api.get<AttendanceHistory>("/me/attendance-history")).data,
  });
}

export interface LessonRecording {
  id: string;
  title: string;
  videoUrl: string;
  durationSeconds: number | null;
  recordedDate: string;
  groupId: string;
}

export function useRecordings(groupId?: string) {
  return useQuery({
    queryKey: ["recordings", groupId],
    queryFn: async () => (await api.get<LessonRecording[]>("/recordings", { params: groupId ? { groupId } : {} })).data,
  });
}

export interface Homework {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  xpReward: number;
  /** O'quvchi ko'rinishiga xos. */
  done?: boolean;
  /** O'qituvchi/admin ko'rinishiga xos. */
  groupId?: string;
  groupName?: string;
  groupColor?: string | null;
  completionCount?: number;
  totalStudents?: number;
  /** Vazifa qaysi dars uchun berilgani — bir guruhda bir necha marta dars
   *  bo'lganda ularni ajratish uchun. */
  scheduleSlotId?: string | null;
  lessonDate?: string | null;
  lessonTime?: string | null;
}

export function useHomework(groupId?: string) {
  return useQuery({
    queryKey: ["homework", groupId],
    queryFn: async () => (await api.get<Homework[]>("/homework", { params: groupId ? { groupId } : {} })).data,
  });
}

export function useCompleteHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/homework/${id}/complete`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export function useCreateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      groupId: string; title: string; description?: string; dueDate?: string; xpReward?: number;
      scheduleSlotId?: string; lessonDate?: string;
    }) =>
      (await api.post("/homework", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export function useUpdateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string | null; dueDate?: string | null; xpReward?: number }) =>
      (await api.patch(`/homework/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
}

export interface HomeworkCompletion {
  studentId: string;
  fullName: string;
  done: boolean;
}

export function useHomeworkCompletions(homeworkId: string | null) {
  return useQuery({
    queryKey: ["homeworkCompletions", homeworkId],
    queryFn: async () => (await api.get<HomeworkCompletion[]>(`/homework/${homeworkId}/completions`)).data,
    enabled: !!homeworkId,
  });
}

export function useMarkHomeworkDoneByTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ homeworkId, studentId }: { homeworkId: string; studentId: string }) =>
      (await api.post(`/homework/${homeworkId}/complete/${studentId}`)).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["homeworkCompletions", vars.homeworkId] });
      qc.invalidateQueries({ queryKey: ["homework"] });
    },
  });
}

export function useDeleteHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/homework/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homework"] }),
  });
}

