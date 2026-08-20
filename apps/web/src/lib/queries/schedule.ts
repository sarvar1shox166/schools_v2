import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import type { ScheduleSlot } from "./core.js";

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: async () => (await api.get<ScheduleSlot[]>("/schedule")).data,
  });
}

export interface ScheduleOccurrenceSlot extends ScheduleSlot {
  occurrenceDate: string;
  exceptionKind?: "cancelled" | "rescheduled";
}

export interface ScheduleOccurrenceDay {
  date: string;
  slots: ScheduleOccurrenceSlot[];
}

/** Haftalik shablonni [from, to] oralig'idagi haqiqiy sanalarga yoyilgan holda qaytaradi. */
export function useScheduleOccurrences(from: string, to: string) {
  return useQuery({
    queryKey: ["scheduleOccurrences", from, to],
    queryFn: async () =>
      (await api.get<ScheduleOccurrenceDay[]>("/schedule/occurrences", { params: { from, to } })).data,
  });
}

export interface CreateSlotPayload {
  groupId?: string;
  teacherId?: string;
  lessonType: "guruh" | "individual" | "diagnostika";
  customName?: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes?: number;
  roomId?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: "zoom" | "meet";
  specificDate?: string | null;
}

export function useCreateScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSlotPayload) =>
      (await api.post("/schedule", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
    },
  });
}

export function useUpdateScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<CreateSlotPayload>) =>
      (await api.patch(`/schedule/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
    },
  });
}

export function useDeleteScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schedule/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
    },
  });
}

// ── Dars istisnolari (bitta darsni bekor qilish/ko'chirish) va bayram kunlari ──

export interface ScheduleException {
  id: string;
  scheduleSlotId: string | null;
  date: string;
  kind: "cancelled" | "rescheduled" | "holiday";
  newDate: string | null;
  newStartTime: string | null;
  reason: string | null;
}

export function useScheduleExceptions(from?: string, to?: string) {
  return useQuery({
    queryKey: ["scheduleExceptions", from, to],
    queryFn: async () =>
      (await api.get<ScheduleException[]>("/schedule/exceptions", { params: from && to ? { from, to } : {} })).data,
  });
}

export function useCreateScheduleException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleSlotId, ...payload }: {
      scheduleSlotId: string; date: string; kind: "cancelled" | "rescheduled";
      newDate?: string; newStartTime?: string; reason?: string;
    }) => (await api.post(`/schedule/${scheduleSlotId}/exceptions`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduleExceptions"] });
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
      qc.invalidateQueries({ queryKey: ["daySlots"] });
      qc.invalidateQueries({ queryKey: ["unresolvedAbsences"] });
      qc.invalidateQueries({ queryKey: ["nextLesson"] });
      qc.invalidateQueries({ queryKey: ["cancelledToday"] });
    },
  });
}

export function useDeleteScheduleException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schedule/exceptions/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduleExceptions"] });
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
    },
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; reason?: string }) =>
      (await api.post("/schedule/holidays", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduleExceptions"] });
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schedule/holidays/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduleExceptions"] });
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
      qc.invalidateQueries({ queryKey: ["scheduleOccurrences"] });
    },
  });
}

export interface TeacherScheduleData {
  slots: (ScheduleSlot & { studentsCount: number })[];
  groups: { id: string; name: string; color: string | null; studentsCount: number; weeklyHours: number; slotsCount: number }[];
  defaultMeetingUrl: string | null;
}

export function useTeacherSchedule() {
  return useQuery({
    queryKey: ["teacherSchedule"],
    queryFn: async () => (await api.get<TeacherScheduleData>("/me/teacher-schedule")).data,
  });
}

export function useUpdateLessonMeetingUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleSlotId, meetingUrl }: { scheduleSlotId: string; meetingUrl: string | null }) =>
      (await api.patch(`/me/schedule/${scheduleSlotId}/meeting-url`, { meetingUrl })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
      qc.invalidateQueries({ queryKey: ["teacherSchedule"] });
    },
  });
}

export function useUpdateDefaultMeetingUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (defaultMeetingUrl: string | null) =>
      (await api.patch("/me/teacher/default-meeting-url", { defaultMeetingUrl })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacherSchedule"] });
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
    },
  });
}

export interface GroupStudent {
  id: string;
  fullName: string;
}

export function useGroupStudents(groupId: string | null) {
  return useQuery({
    queryKey: ["groupStudents", groupId],
    queryFn: async () => (await api.get<GroupStudent[]>(`/groups/${groupId}/students`)).data,
    enabled: !!groupId,
  });
}

export function useAwardXp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, amount, note }: { studentId: string; amount: number; note?: string }) =>
      (await api.post<{ xp: number; level: number; streak: number; xpAwarded: number }>(
        `/teacher/students/${studentId}/xp`, { amount, note }
      )).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myStudentsProgress"] });
      qc.invalidateQueries({ queryKey: ["myStudents"] });
    },
  });
}

export function useTodaySchedule() {
  return useQuery({
    queryKey: ["scheduleToday"],
    queryFn: async () => (await api.get<ScheduleSlot[]>("/schedule/today")).data,
  });
}

export function useAttendance(scheduleSlotId: string | null, date: string) {
  return useQuery({
    queryKey: ["attendance", scheduleSlotId, date],
    queryFn: async () =>
      (await api.get<{ studentId: string; status: "p" | "a" | "l" | "ae"; reason: string | null; lessonCounted: boolean }[]>("/attendance", {
        params: { scheduleSlotId, date },
      })).data,
    enabled: !!scheduleSlotId,
  });
}

