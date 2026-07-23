import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";


export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      scheduleSlotId: string;
      date: string;
      records: { studentId: string; status: "p" | "a" | "l" | "ae"; reason?: string }[];
    }) => (await api.post("/attendance", payload)).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance", vars.scheduleSlotId, vars.date] });
      qc.invalidateQueries({ queryKey: ["attendanceStats"] });
    },
  });
}

export function useJoinLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleSlotId: string) => (await api.post("/me/attendance/join", { scheduleSlotId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPackages"] });
      qc.invalidateQueries({ queryKey: ["attendanceStats"] });
    },
  });
}

export function useJoinTeacherLesson() {
  return useMutation({
    mutationFn: async (scheduleSlotId: string) => (await api.post("/me/teacher-attendance/join", { scheduleSlotId })).data,
  });
}

export function useEndLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      scheduleSlotId: string;
      topic?: string;
      homework?: { title: string; description?: string; dueDate?: string; xpReward?: number };
    }) => (await api.post<{ lessonId: string | null; homeworkId: string | null }>("/lessons/end", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduleToday"] });
      qc.invalidateQueries({ queryKey: ["homework"] });
    },
  });
}

export function useLinkTelegram() {
  return useMutation({
    mutationFn: async (initData: string) => (await api.post("/me/telegram-link", { initData })).data,
  });
}

// ---- Notifications ----

