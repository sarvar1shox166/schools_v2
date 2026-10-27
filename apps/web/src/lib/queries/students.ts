import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import type { Student, Group } from "./core.js";

export interface StudentsPage {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.get<Student[]>("/students")).data,
  });
}

export function useStudentsPaged(page: number, pageSize: number) {
  return useQuery({
    queryKey: ["students", "paged", page, pageSize],
    queryFn: async () => (await api.get<StudentsPage>("/students", { params: { page, pageSize } })).data,
    placeholderData: (prev) => prev,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fullName: string; phone: string; level?: string; age?: number; groupId?: string }) =>
      (await api.post("/students", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/students/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export interface StudentDeletionImpact {
  student: { id: string; fullName: string; phone: string; status: "yangi" | "faol" | "nofaol"; isActive: boolean };
  counts: {
    transactions: number;
    paidTotal: number;
    charges: number;
    outstandingDebt: number;
    packages: number;
    activePackages: number;
    remainingLessons: number;
    attendanceRecords: number;
    groups: { id: string; name: string }[];
    lessonHistory: number;
    futureEmptySlots: number;
    homeworkCompletions: number;
    achievements: number;
    xp: number;
  };
  blockers: { code: string; message: string }[];
  canDelete: boolean;
}

/** O'chirishdan oldin nima yo'qolishini/bloklanishini oladi (tasdiqlash oynasi uchun). */
export function useStudentDeletionImpact(studentId: string) {
  return useQuery({
    queryKey: ["studentDeletionImpact", studentId],
    queryFn: async () => (await api.get<StudentDeletionImpact>(`/students/${studentId}/deletion-impact`)).data,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useDeactivateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/students/${id}/deactivate`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student"] });
    },
  });
}

export function useActivateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/students/${id}/activate`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student"] });
    },
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await api.get<Group[]>("/groups")).data,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; level?: string; teacherId?: string; color?: string; capacity?: number; totalLessons?: number }) =>
      (await api.post("/groups", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/groups/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

