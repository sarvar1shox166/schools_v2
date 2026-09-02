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

/** Bitta pul harakati — majburiyatga kelgan to'lov. */
export interface Payment {
  id: string;
  amount: number;
  method: "click" | "payme" | "naqd" | "uzcard";
  status: "pending" | "paid" | "failed" | "cancelled";
  paidAt: string | null;
  createdAt: string;
}

/**
 * Majburiyat (charge) — o'quvchi nima uchun qancha to'lashi kerak.
 * Qarz saqlanmaydi, hisoblanadi: amount − to'langan to'lovlar yig'indisi.
 * To'lov holati (status) va obuna holati (packageDaysLeft) — ikki BOSHQA narsa.
 */
export interface Charge {
  id: string;
  amount: number;
  paid: number;
  balance: number;
  /** To'lov holati — pul kelgan/kelmaganiga qarab. Obunaga aloqasi yo'q. */
  status: "paid" | "partial" | "deferred" | "overdue";
  note: string | null;
  createdAt: string;
  /** TO'LOV muddati — pul qachongacha kelishi kerak. */
  dueDate: string | null;
  paymentDaysLeft: number | null;
  /** PAKET (obuna) muddati — paketning o'zidan, nusxa emas. */
  packageExpiresAt: string | null;
  packageDaysLeft: number | null;
  studentPackageId: string | null;
  usedLessons: number | null;
  totalLessons: number | null;
  packageName: string | null;
  studentId: string;
  studentName: string;
  groupName: string | null;
  payments: Payment[];
}

export interface ChargesPage {
  items: Charge[];
  total: number;
  limit: number;
  offset: number;
}

export function useCharges(params?: { studentId?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ["charges", params?.studentId, params?.status, params?.limit],
    queryFn: async () =>
      (await api.get<ChargesPage>("/payments", {
        params: {
          ...(params?.studentId ? { studentId: params.studentId } : {}),
          ...(params?.status ? { status: params.status } : {}),
          limit: params?.limit ?? 500,
        },
      })).data,
  });
}

/** Majburiyat/to'lov o'zgarganda qayta yuklanishi kerak bo'lgan hamma narsa. */
function invalidatePayments(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["charges"] });
  qc.invalidateQueries({ queryKey: ["paymentsStats"] });
  qc.invalidateQueries({ queryKey: ["studentPackages"] });
  qc.invalidateQueries({ queryKey: ["students"] });
}

/** Paketsiz majburiyat — eski qarzni rasmiylashtirish, ro'yxatdan o'tish to'lovi va h.k. */
export function useCreateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      studentId: string; amount: number; dueDate?: string; note?: string; createdAt?: string;
    }) => (await api.post("/charges", payload)).data,
    onSuccess: () => invalidatePayments(qc),
  });
}

export function useUpdateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; amount?: number; dueDate?: string | null; note?: string; createdAt?: string;
    }) => (await api.patch(`/charges/${id}`, payload)).data,
    onSuccess: () => invalidatePayments(qc),
  });
}

export function useDeleteCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/charges/${id}`)).data,
    onSuccess: () => invalidatePayments(qc),
  });
}

/** To'lov qo'shish. amount berilmasa — qolgan qoldiq to'liq yopiladi. */
export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chargeId, ...payload }: {
      chargeId: string; amount?: number; method?: "click" | "payme" | "naqd" | "uzcard"; paidAt?: string;
    }) => (await api.post(`/charges/${chargeId}/payments`, payload)).data,
    onSuccess: () => invalidatePayments(qc),
  });
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

export interface PaymentsStats {
  totalReceived: number;
  totalDebt: number;
  totalPaidThisPeriod: number;
  totalPending: number;
  expiringCount: number;
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
  specificDate: string | null;
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
  specificDate: string | null;
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
    mutationFn: async (payload: { studentId: string; packageId: string; method: "click" | "payme" | "naqd" | "uzcard"; expiresAt?: string; paidAt?: string; payLater?: boolean; paymentDueDate?: string }) =>
      (await api.post("/student-packages", payload)).data,
    onSuccess: () => invalidatePayments(qc),
  });
}

/** Bitta pul harakatini tahrirlash — majburiyatga (va uning muddatiga) tegmaydi. */
export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; amount?: number; method?: "click" | "payme" | "naqd" | "uzcard";
      status?: "pending" | "paid" | "failed" | "cancelled"; createdAt?: string;
    }) => (await api.patch(`/transactions/${id}`, payload)).data,
    onSuccess: () => invalidatePayments(qc),
  });
}

/** Bitta to'lovni o'chirish — majburiyat va paket joyida qoladi,
 *  faqat to'langan summa kamayadi va qoldiq qayta hisoblanadi. */
export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/transactions/${id}`)).data,
    onSuccess: () => invalidatePayments(qc),
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
