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

