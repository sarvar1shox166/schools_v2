import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export interface Package {
  id: string;
  name: string;
  lessonsCount: number;
  price: number;
  active: boolean;
  lessonType: "group" | "individual";
  tier: "standard" | "pro";
  lessonsPerMonth: number | null;
  lessonsPerWeek: number | null;
  durationMinutes: number | null;
  maxStudents: number | null;
  delivery: "online" | "offline";
}

export interface StudentPackage {
  id: string;
  totalLessons: number;
  usedLessons: number;
  status: "active" | "finished" | "expired";
  purchasedAt: string;
  expiresAt: string | null;
  packageName: string;
  price: number;
}

export interface Transaction {
  id: string;
  amount: number;
  method: "click" | "payme" | "naqd" | "uzcard";
  status: "pending" | "paid" | "failed" | "cancelled";
  displayStatus: "pending" | "paid" | "failed" | "cancelled" | "overdue";
  dueDate: string | null;
  daysLeft: number | null;
  providerRef: string | null;
  createdAt: string;
  studentName: string;
  groupName: string | null;
}

export function usePackages() {
  return useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await api.get<Package[]>("/packages")).data,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string; lessonsCount: number; price: number;
      lessonType?: "group" | "individual"; tier?: "standard" | "pro";
      lessonsPerMonth?: number; lessonsPerWeek?: number;
      durationMinutes?: number; maxStudents?: number;
      delivery?: "online" | "offline";
    }) => (await api.post("/packages", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packages"] }),
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; lessonsCount?: number; price?: number; active?: boolean; lessonType?: "group" | "individual"; tier?: "standard" | "pro"; lessonsPerMonth?: number; lessonsPerWeek?: number; durationMinutes?: number; maxStudents?: number; delivery?: "online" | "offline" }) =>
      (await api.patch(`/packages/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packages"] }),
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/packages/${id}`, { active: false })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packages"] }),
  });
}

export function useTransactions(studentId?: string) {
  return useQuery({
    queryKey: ["transactions", studentId],
    queryFn: async () =>
      (await api.get<Transaction[]>("/transactions", { params: studentId ? { studentId } : {} })).data,
  });
}

export interface PaymentsStats {
  totalReceived: number;
  totalDebt: number;
  totalPaidThisPeriod: number;
  totalPending: number;
}

export function usePaymentsStats() {
  return useQuery({
    queryKey: ["paymentsStats"],
    queryFn: async () => (await api.get<PaymentsStats>("/payments/stats")).data,
  });
}

export interface AttendanceStats {
  date: string;
  avgPercent: number;
  present: number;
  late: number;
  absent: number;
  total: number;
}

export function useAttendanceStats(date?: string) {
  return useQuery({
    queryKey: ["attendanceStats", date],
    queryFn: async () => (await api.get<AttendanceStats>("/attendance/stats", { params: date ? { date } : {} })).data,
  });
}

export interface AttendanceHistoryMatrix {
  dates: string[];
  students: { studentId: string; fullName: string; days: ("p" | "a" | "l" | null)[]; percent: number }[];
}

export function useAttendanceHistoryMatrix(groupId: string | null, days = 8) {
  return useQuery({
    queryKey: ["attendanceHistoryMatrix", groupId, days],
    queryFn: async () =>
      (await api.get<AttendanceHistoryMatrix>("/attendance/history", { params: { groupId, days } })).data,
    enabled: !!groupId,
  });
}

export interface TeacherAttendanceStats {
  date: string;
  avgPercent: number;
  present: number;
  late: number;
  absent: number;
  total: number;
}

export function useTeacherAttendanceStats(date?: string) {
  return useQuery({
    queryKey: ["teacherAttendanceStats", date],
    queryFn: async () => (await api.get<TeacherAttendanceStats>("/attendance/teacher/stats", { params: date ? { date } : {} })).data,
  });
}

export interface TeacherAttendanceHistoryMatrix {
  dates: string[];
  // Har qator — bitta o'qituvchining bitta guruh/darsligi (schedule_slot).
  // Bir kunda bir nechta guruhi bo'lgan o'qituvchi endi bir nechta qatorda ko'rinadi,
  // shuning uchun qaysi guruhi o'tilib, qaysi biri o'tkazib yuborilgani aniq bo'ladi.
  rows: {
    teacherId: string; scheduleSlotId: string;
    fullName: string; title: string | null; spec: string | null;
    groupLabel: string;
    days: ("p" | "a" | "l" | null)[]; percent: number;
  }[];
}

export function useTeacherAttendanceHistoryMatrix(days = 8) {
  return useQuery({
    queryKey: ["teacherAttendanceHistoryMatrix", days],
    queryFn: async () =>
      (await api.get<TeacherAttendanceHistoryMatrix>("/attendance/teacher/history", { params: { days } })).data,
  });
}

export interface DaySlot {
  scheduleSlotId: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherTitle: string | null;
  teacherSpec: string | null;
  groupId: string | null;
  groupName: string | null;
  lessonType: "guruh" | "individual" | "diagnostika";
  customName: string | null;
  startTime: string;
  studentsCount: number;
  status: "p" | "a" | "l" | null;
}

export function useDaySlots(date: string) {
  return useQuery({
    queryKey: ["daySlots", date],
    queryFn: async () =>
      (await api.get<{ date: string; dayOfWeek: number; slots: DaySlot[] }>("/attendance/teacher/day-slots", { params: { date } })).data,
    enabled: !!date,
  });
}

export interface UnresolvedAbsence {
  scheduleSlotId: string;
  teacherId: string;
  teacherName: string;
  groupLabel: string;
  startTime: string;
  date: string;
}

export function useUnresolvedAbsences() {
  return useQuery({
    queryKey: ["unresolvedAbsences"],
    queryFn: async () => (await api.get<UnresolvedAbsence[]>("/attendance/teacher/unresolved-absences")).data,
  });
}

export function useMarkTeacherAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      records: { scheduleSlotId: string; teacherId: string; status: "p" | "a" | "l" }[];
    }) => (await api.post("/attendance/teacher", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacherAttendanceStats"] });
      qc.invalidateQueries({ queryKey: ["teacherAttendanceHistoryMatrix"] });
      qc.invalidateQueries({ queryKey: ["daySlots"] });
    },
  });
}

export function useAssignPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { studentId: string; packageId: string; method: "click" | "payme" | "naqd" | "uzcard"; expiresAt?: string; paidAt?: string; payLater?: boolean }) =>
      (await api.post("/student-packages", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["studentPackages"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["paymentsStats"] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; amount?: number; method?: "click" | "payme" | "naqd" | "uzcard";
      status?: "pending" | "paid" | "failed" | "cancelled"; dueDate?: string | null; createdAt?: string;
    }) => (await api.patch(`/transactions/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["paymentsStats"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/transactions/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["paymentsStats"] });
    },
  });
}

export function useUpdateStudentPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; totalLessons?: number; usedLessons?: number;
      status?: "active" | "finished" | "expired"; expiresAt?: string | null;
    }) => (await api.patch(`/student-packages/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studentPackages"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useStudentPackages(studentId: string | null) {
  return useQuery({
    queryKey: ["studentPackages", studentId],
    queryFn: async () => (await api.get<StudentPackage[]>(`/students/${studentId}/packages`)).data,
    enabled: !!studentId,
  });
}

export function useMyPackages() {
  return useQuery({
    queryKey: ["myPackages"],
    queryFn: async () => (await api.get<StudentPackage[]>("/me/packages")).data,
  });
}
