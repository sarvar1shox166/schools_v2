import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";


export interface TeacherRate {
  groupRate: number;
  individualRate: number;
  diagnosticRate: number;
  retentionCoef: number;
}

export interface LessonSession {
  id: string;
  date: string;
  lessonType: "group" | "individual" | "diagnostic";
  studentsCount: number;
  amount: number;
  groupName: string;
}

export interface TeacherIncome {
  groupAmount: number;
  individualAmount: number;
  diagnosticAmount: number;
  totalAmount: number;
  sessions: LessonSession[];
}

export interface PayrollRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  period: string;
  groupAmount: number;
  individualAmount: number;
  diagnosticAmount: number;
  totalAmount: number;
  generatedAt: string;
}

export function useTeacherRate(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacherRate", teacherId],
    queryFn: async () => (await api.get<TeacherRate>(`/teachers/${teacherId}/rate`)).data,
    enabled: !!teacherId,
  });
}

export function useUpdateTeacherRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, ...payload }: { teacherId: string } & Partial<TeacherRate>) =>
      (await api.patch(`/teachers/${teacherId}/rate`, payload)).data,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["teacherRate", vars.teacherId] }),
  });
}

export function useMyLessons() {
  return useQuery({
    queryKey: ["teacherLessons"],
    queryFn: async () => (await api.get<LessonSession[]>("/teacher/lessons")).data,
  });
}

export function useMyIncome(period: string) {
  return useQuery({
    queryKey: ["teacherIncome", period],
    queryFn: async () => (await api.get<TeacherIncome>("/teacher/income", { params: { period } })).data,
  });
}

export function usePayroll(period: string) {
  return useQuery({
    queryKey: ["payroll", period],
    queryFn: async () => (await api.get<PayrollRecord[]>("/payroll", { params: { period } })).data,
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (period: string) => (await api.post("/payroll/generate", { period })).data,
    onSuccess: (_data, period) => qc.invalidateQueries({ queryKey: ["payroll", period] }),
  });
}

export interface TeacherPayrollSummary {
  teacherId: string;
  teacherName: string;
  earnedThisPeriod: number;
  totalPaid: number;
  balance: number;
}

export function usePayrollSummary(period: string) {
  return useQuery({
    queryKey: ["payrollSummary", period],
    queryFn: async () => (await api.get<TeacherPayrollSummary[]>("/payroll/summary", { params: { period } })).data,
  });
}

export interface TeacherPayout {
  id: string;
  amount: number;
  note: string | null;
  paidAt: string;
  createdAt: string;
  createdByName: string | null;
}

export function useTeacherPayouts(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacherPayouts", teacherId],
    enabled: !!teacherId,
    queryFn: async () => (await api.get<TeacherPayout[]>(`/teachers/${teacherId}/payouts`)).data,
  });
}

export function useAddTeacherPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, ...payload }: { teacherId: string; amount: number; note?: string; paidAt?: string }) =>
      (await api.post(`/teachers/${teacherId}/payouts`, payload)).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["teacherPayouts", vars.teacherId] });
      qc.invalidateQueries({ queryKey: ["payrollSummary"] });
    },
  });
}

export function useDeleteTeacherPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, payoutId }: { teacherId: string; payoutId: string }) =>
      (await api.delete(`/teachers/${teacherId}/payouts/${payoutId}`)).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["teacherPayouts", vars.teacherId] });
      qc.invalidateQueries({ queryKey: ["payrollSummary"] });
    },
  });
}

