import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export interface IncomeSummaryPoint {
  month: string;
  amount: number;
}

export interface IncomeBreakdownItem {
  name: string;
  amount: number;
  count: number;
}

export interface PaymentMethodStat {
  method: string;
  amount: number;
  count: number;
}

export interface ReportsOverview {
  studentsCount: number;
  teachersCount: number;
  groupsCount: number;
  monthIncome: number;
  pendingPayments: number;
  attendanceRate: number;
}

export function useIncomeSummary() {
  return useQuery({
    queryKey: ["reports", "income-summary"],
    queryFn: async () => (await api.get<IncomeSummaryPoint[]>("/reports/income-summary")).data,
  });
}

export function useIncomeBreakdown() {
  return useQuery({
    queryKey: ["reports", "income-breakdown"],
    queryFn: async () => (await api.get<IncomeBreakdownItem[]>("/reports/income-breakdown")).data,
  });
}

export function usePaymentMethodStats() {
  return useQuery({
    queryKey: ["reports", "payment-methods"],
    queryFn: async () => (await api.get<PaymentMethodStat[]>("/reports/payment-methods")).data,
  });
}

export function useReportsOverview() {
  return useQuery({
    queryKey: ["reports", "overview"],
    queryFn: async () => (await api.get<ReportsOverview>("/reports/overview")).data,
  });
}

export interface StudentGrowthPoint {
  month: string;
  count: number;
}

export function useStudentGrowth() {
  return useQuery({
    queryKey: ["reports", "student-growth"],
    queryFn: async () => (await api.get<StudentGrowthPoint[]>("/reports/student-growth")).data,
  });
}

export interface IncomeExtra {
  yearTotal: number;
  planCompletionPct: number;
  avgPerStudent: number;
}

export function useIncomeExtra() {
  return useQuery({
    queryKey: ["reports", "income-extra"],
    queryFn: async () => (await api.get<IncomeExtra>("/reports/income-extra")).data,
  });
}

export interface GroupFillRate {
  id: string;
  name: string;
  color: string | null;
  capacity: number;
  count: number;
}

export function useGroupFillRate() {
  return useQuery({
    queryKey: ["reports", "group-fill-rate"],
    queryFn: async () => (await api.get<GroupFillRate[]>("/reports/group-fill-rate")).data,
  });
}

// ---- Teacher portal ----

