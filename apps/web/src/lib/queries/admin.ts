import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import type { Student } from "./core.js";

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface BrandSettings {
  name: string; phone: string; address: string; telegram: string; logoUrl: string;
}

export interface SystemSettings {
  autoOperator: boolean; debtReminder: boolean; onlinePayment: boolean;
  selfUnregister: boolean; telegramBot: boolean;
  language: string; currency: string; timezone: string; yearStart: string;
}

export interface SalarySetting {
  teacherId: string;
  teacherName: string;
  salaryType: "per_lesson" | "monthly_fixed" | "percent_income";
  groupRate: number;
  individualRate: number;
  diagnosticRate: number;
  monthlyAmount: number;
  incomePercent: number;
}

export function useBrandSettings() {
  return useQuery({
    queryKey: ["settings", "brand"],
    queryFn: async () => (await api.get<BrandSettings>("/settings/brand")).data,
  });
}

export function useUpdateBrandSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<BrandSettings>) => (await api.put("/settings/brand", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "brand"] }),
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ["settings", "system"],
    queryFn: async () => (await api.get<SystemSettings>("/settings/system")).data,
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<SystemSettings>) => (await api.put("/settings/system", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "system"] }),
  });
}

export function useSalarySettings() {
  return useQuery({
    queryKey: ["settings", "salary"],
    queryFn: async () => (await api.get<SalarySetting[]>("/settings/salary")).data,
  });
}

export function useUpdateSalarySetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<SalarySetting> & { teacherId: string }) =>
      (await api.put("/settings/salary", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "salary"] }),
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: async (body: { title: string; body: string; targetRole?: "teacher" | "student" | "all" }) =>
      (await api.post<{ ok: boolean; sent: number }>("/notifications/broadcast", body)).data,
  });
}

// ─── Update group hook ────────────────────────────────────────────────────────
export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; level?: string; teacherId?: string; color?: string; capacity?: number; totalLessons?: number }) =>
      (await api.patch(`/groups/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export interface StudentDetail extends Student {
  login: string | null;
  paymentStatus: "active" | "debt" | "inactive" | "no_package" | null;
  activePackageExpires: string | null;
  xp: { xp: number; level: number; streak: number; elo: number } | null;
  totalLessons: number;
  presentCount: number;
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ["student", id],
    queryFn: async () => (await api.get<StudentDetail>(`/students/${id}`)).data,
    enabled: !!id,
  });
}

export function useResetStudentPassword() {
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ tempPassword: string }>(`/students/${id}/reset-password`)).data,
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; fullName?: string; phone?: string; level?: string; age?: number; status?: string; avatarUrl?: string }) =>
      (await api.patch(`/students/${id}`, body)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student", vars.id] });
    },
  });
}

export function useSetStudentGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, oldGroupId, newGroupId }: { studentId: string; oldGroupId: string | null; newGroupId: string | null }) => {
      if (oldGroupId && oldGroupId !== newGroupId) {
        await api.delete(`/students/${studentId}/groups/${oldGroupId}`);
      }
      if (newGroupId && newGroupId !== oldGroupId) {
        await api.post(`/students/${studentId}/groups/${newGroupId}`);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["student", vars.studentId] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; fullName?: string; phone?: string; spec?: string; title?: string; expYears?: number }) =>
      (await api.patch(`/teachers/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useResetTeacherPassword() {
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ tempPassword: string }>(`/teachers/${id}/reset-password`)).data,
  });
}

// ─── Staff hooks ──────────────────────────────────────────────────────────────
export type StaffRole = "operator" | "accountant" | "moderator" | "assistant_admin" | "admin";

export interface StaffMember {
  id: string;
  fullName: string;
  phone: string;
  login: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
}

export function useStaff() {
  return useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: async () => (await api.get("/staff")).data,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fullName: string; phone: string; login?: string; role: StaffRole }) =>
      (await api.post("/staff", body)).data as { id: string; tempPassword: string },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; fullName?: string; phone?: string; login?: string; isActive?: boolean }) =>
      (await api.patch(`/staff/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/staff/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useModeratorTeachers(staffId: string | null) {
  return useQuery<string[]>({
    queryKey: ["staff", staffId, "teachers"],
    queryFn: async () => (await api.get(`/staff/${staffId}/teachers`)).data,
    enabled: !!staffId,
  });
}

export function useAssignModeratorTeachers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teacherIds }: { id: string; teacherIds: string[] }) =>
      (await api.put(`/staff/${id}/teachers`, { teacherIds })).data,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["staff", vars.id, "teachers"] }),
  });
}
