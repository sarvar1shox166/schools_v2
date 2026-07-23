import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api.js";

export interface Teacher {
  id: string;
  fullName: string;
  phone: string;
  spec: string | null;
  title: string | null;
  expYears: number | null;
  joinedAt: string;
  groupsCount: number;
  rating: number | null;
}

export interface StudentGroupRef {
  id: string;
  name: string;
  teacherId?: string | null;
  teacherName?: string | null;
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  level: string | null;
  age: number | null;
  status: "yangi" | "faol" | "nofaol";
  joinedAt: string;
  groups: StudentGroupRef[];
}

export interface Group {
  id: string;
  name: string;
  level: string | null;
  color: string | null;
  capacity: number;
  roomId: string | null;
  roomName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentsCount: number;
  totalLessons: number | null;
  completedLessons: number;
}

export interface ScheduleSlot {
  id: string;
  groupId: string | null;
  groupName: string | null;
  color: string | null;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  /** To'ldirilgan bo'lsa, bu slot faqat shu sanada bo'ladi (bir martalik — masalan diagnostika). */
  specificDate: string | null;
  roomId: string | null;
  roomName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  meetingPlatform: "zoom" | "meet";
  lessonType: "guruh" | "individual" | "diagnostika";
  customName: string | null;
  lessonId?: string | null;
  isEnded?: boolean;
  isStarted?: boolean;
  /** /schedule/today ga xos: bu dars boshqa kundan bugunga ko'chirilganmi. */
  isRescheduled?: boolean;
  /** Bugun uchun o'qituvchi tomonidan allaqachon yakunlangan darsmi (lessons jadvali orqali). */
  endedToday?: boolean;
}

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await api.get<Teacher[]>("/teachers")).data,
  });
}

export interface TeacherRanking {
  id: string;
  fullName: string;
  spec: string | null;
  groupsCount: number;
  studentsCount: number;
  avgRating: number | null;
  reviewCount: number;
}

export interface TeacherReview {
  id: string;
  rating: number;
  comment: string | null;
  period: string;
  createdAt: string;
  teacherName: string;
  reviewerName: string;
}

export function useTeacherRankings() {
  return useQuery({
    queryKey: ["teacherRankings"],
    queryFn: async () => (await api.get<TeacherRanking[]>("/teachers/rankings")).data,
  });
}

export function useTeacherReviews() {
  return useQuery({
    queryKey: ["teacherReviews"],
    queryFn: async () => (await api.get<TeacherReview[]>("/teachers/reviews")).data,
  });
}

export function useAddTeacherReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId, ...payload }: { teacherId: string; rating: number; comment?: string }) =>
      (await api.post(`/teachers/${teacherId}/reviews`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacherRankings"] });
      qc.invalidateQueries({ queryKey: ["teacherReviews"] });
    },
  });
}

export function useDeleteTeacherReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teachers/reviews/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacherReviews"] }),
  });
}

export interface PendingLessonReview {
  lessonId: string;
  topic: string | null;
  conductedAt: string;
  teacherName: string;
}

export function usePendingLessonReviews() {
  return useQuery({
    queryKey: ["pendingLessonReviews"],
    queryFn: async () => (await api.get<PendingLessonReview[]>("/me/lessons/pending-reviews")).data,
    // WS push ("lessonEnded") invalidates this instantly when a lesson ends;
    // polling here is only a safety net for when the socket is down.
    refetchInterval: 60000,
  });
}

export function useSubmitLessonReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, ...payload }: { lessonId: string; rating: number; comment?: string }) =>
      (await api.post(`/lessons/${lessonId}/review`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendingLessonReviews"] }),
  });
}

export interface StudentTeacherReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  studentName: string;
  topic: string | null;
  conductedAt: string;
  moderationStatus: "pending" | "approved" | "rejected";
}

export function useStudentReviewsForTeacher(teacherId: string | null) {
  return useQuery({
    queryKey: ["studentReviews", teacherId],
    enabled: !!teacherId,
    queryFn: async () => (await api.get<StudentTeacherReview[]>(`/teachers/${teacherId}/student-reviews`)).data,
  });
}

export interface StudentLessonHistoryItem {
  lessonId: string;
  topic: string | null;
  conductedAt: string;
  teacherName: string;
  attendanceStatus: "p" | "a" | "l" | "ae";
  reason: string | null;
  rating: number | null;
  comment: string | null;
}

export function useStudentLessonHistory() {
  return useQuery({
    queryKey: ["studentLessonHistory"],
    queryFn: async () => (await api.get<StudentLessonHistoryItem[]>("/me/lessons/history")).data,
  });
}

export interface TeacherLessonReviewItem {
  studentName: string;
  rating: number;
  comment: string | null;
}

export interface TeacherLessonHistoryItem {
  lessonId: string;
  topic: string | null;
  conductedAt: string;
  groupName: string | null;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  avgRating: number | null;
  reviewCount: number;
  reviews: TeacherLessonReviewItem[];
}

export function useTeacherLessonHistory() {
  return useQuery({
    queryKey: ["teacherLessonHistory"],
    queryFn: async () => (await api.get<TeacherLessonHistoryItem[]>("/teachers/me/lessons/history")).data,
  });
}

export interface PendingModerationReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  studentName: string;
  teacherName: string;
  topic: string | null;
  conductedAt: string;
}

export function useModerationQueue() {
  return useQuery({
    queryKey: ["moderationQueue"],
    queryFn: async () => (await api.get<PendingModerationReview[]>("/moderator/lesson-reviews")).data,
  });
}

export function useApproveLessonReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/moderator/lesson-reviews/${id}/approve`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderationQueue"] }),
  });
}

export function useRejectLessonReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/moderator/lesson-reviews/${id}/reject`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderationQueue"] }),
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fullName: string; phone: string; spec?: string; title?: string; expYears?: number }) =>
      (await api.post("/teachers", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/teachers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

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
}

export function useTeacherSchedule() {
  return useQuery({
    queryKey: ["teacherSchedule"],
    queryFn: async () => (await api.get<TeacherScheduleData>("/me/teacher-schedule")).data,
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
  teachers: { teacherId: string; fullName: string; title: string | null; spec: string | null; days: ("p" | "a" | "l" | null)[]; percent: number }[];
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
    mutationFn: async (payload: { studentId: string; packageId: string; method: "click" | "payme" | "naqd" | "uzcard"; expiresAt?: string; paidAt?: string }) =>
      (await api.post("/student-packages", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
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

export type PuzzleSection = "mot1" | "mot2" | "mot3" | "series" | "time";

export interface Puzzle {
  id: string;
  fen: string;
  difficulty: "oson" | "orta" | "qiyin";
  xpReward: number;
  title?: string | null;
  section: PuzzleSection;
  createdByTeacher?: boolean;
}

export interface MyPuzzle {
  id: string;
  fen: string;
  solution: string[];
  difficulty: "oson" | "orta" | "qiyin";
  xpReward: number;
  title: string | null;
  description: string | null;
  section: PuzzleSection;
  createdAt: string;
}

export interface PuzzleAnalytics {
  total: number;
  correct: number;
  attempts: { fullName: string; correct: boolean; attemptedAt: string }[];
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: { current: number; threshold: number };
}

export interface MyXp {
  xp: number;
  level: number;
  streak: number;
  elo: number;
  achievements: Achievement[];
}

export interface AttemptResult {
  correct: boolean;
  finished: boolean;
  fenAfter: string;
  xpAwarded?: number;
  xp?: number;
  level?: number;
  streak?: number;
  newAchievements?: { code: string; name: string; description: string; icon: string }[];
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  xp: number;
  level: number;
  streak: number;
  elo: number;
  wins: number;
}

export function useDailyPuzzle() {
  return useQuery({
    queryKey: ["dailyPuzzle"],
    queryFn: async () => (await api.get<Puzzle | null>("/puzzles/daily")).data,
  });
}

export function usePuzzles(section?: PuzzleSection) {
  return useQuery({
    queryKey: ["puzzles", section],
    queryFn: async () => (await api.get<Puzzle[]>("/puzzles", { params: section ? { section } : undefined })).data,
    enabled: !!section,
  });
}

export function usePuzzleSectionCounts() {
  return useQuery({
    queryKey: ["puzzleSectionCounts"],
    queryFn: async () => (await api.get<Record<string, number>>("/puzzles/section-counts")).data,
  });
}

export function useMyPuzzles() {
  return useQuery({
    queryKey: ["myPuzzles"],
    queryFn: async () => (await api.get<MyPuzzle[]>("/puzzles/mine")).data,
  });
}

export function useCreatePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fen: string;
      solution: string[];
      difficulty: "oson" | "orta" | "qiyin";
      xpReward: number;
      title?: string;
      description?: string;
      section: PuzzleSection;
    }) => (await api.post<{ id: string }>("/puzzles", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPuzzles"] });
      qc.invalidateQueries({ queryKey: ["puzzleSectionCounts"] });
    },
  });
}

export function useDeletePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/puzzles/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPuzzles"] }),
  });
}

export function usePuzzleAnalytics(id: string | null) {
  return useQuery({
    queryKey: ["puzzleAnalytics", id],
    queryFn: async () => (await api.get<PuzzleAnalytics>(`/puzzles/${id}/analytics`)).data,
    enabled: !!id,
  });
}

export function usePuzzleHint() {
  return useMutation({
    mutationFn: async ({ puzzleId, moveIndex }: { puzzleId: string; moveIndex: number }) =>
      (await api.get<{ from: string }>(`/puzzles/${puzzleId}/hint`, { params: { moveIndex } })).data,
  });
}

export function useAttemptPuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ puzzleId, moveIndex, move }: { puzzleId: string; moveIndex: number; move: string }) =>
      (await api.post<AttemptResult>(`/puzzles/${puzzleId}/attempt`, { moveIndex, move })).data,
    onSuccess: (data) => {
      if (data.finished && data.correct) {
        qc.invalidateQueries({ queryKey: ["myXp"] });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
        qc.invalidateQueries({ queryKey: ["puzzleStats"] });
      }
    },
  });
}

export function useMyXp(enabled = true) {
  return useQuery({
    queryKey: ["myXp"],
    queryFn: async () => (await api.get<MyXp>("/me/xp")).data,
    enabled,
  });
}

export interface StreakState {
  streak: number;
  currentDay: number;
  claimedToday: boolean;
  claimedDays: number[];
}

export function useMyStreak() {
  return useQuery({
    queryKey: ["myStreak"],
    queryFn: async () => (await api.get<StreakState>("/me/streak")).data,
  });
}

export interface StreakClaimResult {
  cycleDay: number;
  xpAwarded: number;
  xp: number;
  level: number;
  streak: number;
  newAchievements: { code: string; name: string; description: string; icon: string }[];
}

export function useClaimStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<StreakClaimResult>("/me/streak/claim")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myStreak"] });
      qc.invalidateQueries({ queryKey: ["myXp"] });
    },
  });
}

export interface PuzzleStats {
  correct: number;
  incorrect: number;
  accuracyPct: number;
  byDifficulty: { difficulty: string; correct: number; total: number }[];
}

export function usePuzzleStats() {
  return useQuery({
    queryKey: ["puzzleStats"],
    queryFn: async () => (await api.get<PuzzleStats>("/me/puzzle-stats")).data,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await api.get<LeaderboardEntry[]>("/leaderboard")).data,
  });
}

export interface EloPoint { elo: number; recordedAt: string; }

export function useEloHistory() {
  return useQuery({
    queryKey: ["eloHistory"],
    queryFn: async () => (await api.get<EloPoint[]>("/me/elo-history")).data,
  });
}

export interface GameStats {
  wins: number; draws: number; losses: number; total: number;
  recent: { opponentName: string; result: "win"|"draw"|"loss"; eloChange: number; playedAt: string }[];
}

export function useGameStats() {
  return useQuery({
    queryKey: ["gameStats"],
    queryFn: async () => (await api.get<GameStats>("/me/game-stats")).data,
  });
}

export function useRecordGameResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { opponentName: string; result: "win"|"draw"|"loss"; opponentElo: number }) =>
      (await api.post<{ newElo: number; eloChange: number }>("/pvp/game-result", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myXp"] });
      qc.invalidateQueries({ queryKey: ["eloHistory"] });
      qc.invalidateQueries({ queryKey: ["gameStats"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

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

export interface AppNotification {
  id: string;
  type: string;
  icon: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: async () => (await api.get<AppNotification[]>("/notifications", { params: unreadOnly ? { unread: "true" } : {} })).data,
    // WS push (useNotificationSocket) invalidates this instantly on a new notification;
    // polling here is only a safety net for when the socket is down.
    refetchInterval: 60000,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread-count")).data,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/notifications/read-all")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export interface NotificationStats {
  thisWeek: number;
  unread: number;
  applications: number;
  paymentWarnings: number;
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ["notifications", "stats"],
    queryFn: async () => (await api.get<NotificationStats>("/notifications/stats")).data,
  });
}

// ---- Reports ----

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

export interface MyStudent {
  id: string;
  fullName: string;
  phone: string;
  level: string | null;
  age: number | null;
  status: "yangi" | "faol" | "nofaol";
  joinedAt: string;
  xp: number;
  xpLevel: number;
  groups: StudentGroupRef[];
  lastLessonDate: string | null;
}

export interface MyStudentProgress {
  id: string;
  fullName: string;
  level: string | null;
  xp: number;
  level2: number;
  streak: number;
  attendanceRate: number;
}

export interface MyTeacherProfile {
  id: string;
  fullName: string;
  phone: string;
  spec: string | null;
  title: string | null;
  expYears: number | null;
  joinedAt: string;
  groupsCount: number;
  studentsCount: number;
  attendanceRate: number;
}

export function useMyStudents() {
  return useQuery({
    queryKey: ["myStudents"],
    queryFn: async () => (await api.get<MyStudent[]>("/me/students")).data,
  });
}

export function useMyStudentsProgress(sort: "xp" | "attendance" | "name" = "xp") {
  return useQuery({
    queryKey: ["myStudentsProgress", sort],
    queryFn: async () => (await api.get<MyStudentProgress[]>("/me/students/progress", { params: { sort } })).data,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => (await api.get<MyTeacherProfile>("/me/profile")).data,
  });
}

export interface MyRatingBreakdown {
  reviewCount: number;
  lessonQuality: number | null;
  studentResults: number | null;
  punctuality: number | null;
  communication: number | null;
}

export function useMyRatingBreakdown() {
  return useQuery({
    queryKey: ["myRatingBreakdown"],
    queryFn: async () => (await api.get<MyRatingBreakdown>("/me/rating-breakdown")).data,
  });
}

export interface TeacherScheduleSlot {
  id: string;
  groupId: string;
  groupName: string;
  color: string | null;
  dayOfWeek: number;
  startTime: string;
  roomId: string | null;
  roomName: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  studentsCount: number;
}

export interface TeacherScheduleGroup {
  id: string;
  name: string;
  color: string | null;
  studentsCount: number;
  weeklyHours: number;
  slotsCount: number;
}

export interface MyTeacherSchedule {
  slots: TeacherScheduleSlot[];
  groups: TeacherScheduleGroup[];
}

export function useMyTeacherSchedule() {
  return useQuery({
    queryKey: ["myTeacherSchedule"],
    queryFn: async () => (await api.get<MyTeacherSchedule>("/me/teacher-schedule")).data,
  });
}

// ---- Lesson materials ----

export interface LessonMaterial {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  groupId: string | null;
  groupName: string | null;
}

export function useMaterials(groupId?: string) {
  return useQuery({
    queryKey: ["materials", groupId],
    queryFn: async () => (await api.get<LessonMaterial[]>("/materials", { params: groupId ? { groupId } : {} })).data,
  });
}

export function useUploadMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; groupId?: string; file: File }) => {
      const form = new FormData();
      form.append("title", payload.title);
      if (payload.groupId) form.append("groupId", payload.groupId);
      form.append("file", payload.file);
      return (await api.post("/materials", form)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/materials/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

// ---- Messages ----

export interface MessageThread {
  userId: string;
  fullName: string;
  role: string;
  lastBody: string | null;
  lastAt: string | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function useMessageThreads() {
  return useQuery({
    queryKey: ["messageThreads"],
    queryFn: async () => (await api.get<MessageThread[]>("/messages/threads")).data,
    refetchInterval: 5000,
  });
}

export function useMessageThread(userId: string | null) {
  return useQuery({
    queryKey: ["messageThread", userId],
    queryFn: async () => (await api.get<Message[]>(`/messages/${userId}`)).data,
    enabled: !!userId,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { recipientId: string; body: string }) => (await api.post<Message>("/messages", payload)).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["messageThread", vars.recipientId] });
      qc.invalidateQueries({ queryKey: ["messageThreads"] });
    },
  });
}

export interface VideoCourse {
  id: string;
  title: string;
  category: "zoom" | "debyut" | "taktika" | "endshpil" | "strategiya";
  thumbnailUrl: string | null;
  thumbnailColor: string | null;
  thumbnailIcon: string | null;
  videoCount: number;
  watchedCount: number;
  lessonCompletionXp: number;
  courseCompletionXp: number;
}

export interface VideoLessonItem {
  id: string;
  title: string;
  videoUrl: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  progressPct: number;
  lessonDone: boolean;
}

export interface VideoCourseExamStatus {
  questionCount: number;
  completed: boolean;
  allLessonsDone: boolean;
}

export interface VideoCourseDetail extends VideoCourse {
  lessons: VideoLessonItem[];
  exam?: VideoCourseExamStatus;
}

export function useVideoCourses(category?: string) {
  return useQuery({
    queryKey: ["video-courses", category],
    queryFn: async () => (await api.get<VideoCourse[]>("/video-courses", { params: category ? { category } : {} })).data,
  });
}

export function useVideoCourseDetail(courseId: string | undefined) {
  return useQuery({
    queryKey: ["video-course", courseId],
    enabled: !!courseId,
    queryFn: async () => (await api.get<VideoCourseDetail>(`/video-courses/${courseId}`)).data,
  });
}

export function useCreateVideoCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string; category: string;
      thumbnailUrl?: string; thumbnailColor?: string; thumbnailIcon?: string;
      lessonCompletionXp?: number; courseCompletionXp?: number;
    }) => (await api.post<{ id: string }>("/video-courses", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-courses"] }),
  });
}

export function useUpdateVideoCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; title?: string; category?: string;
      thumbnailUrl?: string; thumbnailColor?: string; thumbnailIcon?: string;
      lessonCompletionXp?: number; courseCompletionXp?: number;
    }) => (await api.patch(`/video-courses/${id}`, payload)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-courses"] });
      qc.invalidateQueries({ queryKey: ["video-course", vars.id] });
    },
  });
}

export function useDeleteVideoCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/video-courses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-courses"] }),
  });
}

export function useAddVideoLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, ...payload }: {
      courseId: string; title: string; videoUrl: string; durationSeconds?: number; thumbnailUrl?: string;
    }) => (await api.post<{ id: string }>(`/video-courses/${courseId}/videos`, payload)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
      qc.invalidateQueries({ queryKey: ["video-courses"] });
    },
  });
}

export function useUpdateVideoLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, ...payload }: {
      id: string; courseId: string; title?: string; videoUrl?: string; durationSeconds?: number; thumbnailUrl?: string;
    }) => (await api.patch(`/videos/${id}`, payload)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] }),
  });
}

export function useDeleteVideoLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; courseId: string }) => (await api.delete(`/videos/${id}`)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
      qc.invalidateQueries({ queryKey: ["video-courses"] });
    },
  });
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post<{ url: string }>("/videos/upload", form)).data;
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post<{ url: string }>("/upload/image", form)).data;
    },
  });
}

export function useUpdateVideoProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, progressPct }: { videoId: string; progressPct: number; courseId?: string }) =>
      (await api.post<{
        xp?: number; level?: number; streak?: number; xpAwarded?: number;
        lessonXpAwarded?: number; courseXpAwarded?: number;
      }>(`/videos/${videoId}/progress`, { progressPct })).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["video-courses"] });
      if (vars.courseId) qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
    },
  });
}

export interface VideoQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number; // present for admin/teacher only
}

export function useVideoQuiz(videoId: string | undefined) {
  return useQuery({
    queryKey: ["videoQuiz", videoId],
    enabled: !!videoId,
    queryFn: async () => (await api.get<VideoQuizQuestion[]>(`/videos/${videoId}/quiz`)).data,
  });
}

export function useAddQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, ...body }: { videoId: string; question: string; options: string[]; correctIndex: number }) =>
      (await api.post<{ id: string }>(`/videos/${videoId}/quiz`, body)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["videoQuiz", vars.videoId] }),
  });
}

export function useDeleteQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string; videoId: string }) =>
      (await api.delete(`/videos/quiz/${questionId}`)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["videoQuiz", vars.videoId] }),
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, answers, courseId }: { videoId: string; answers: number[]; courseId?: string }) =>
      (await api.post<{
        score: number; total: number; xpAwarded?: number;
        lessonXpAwarded?: number; courseXpAwarded?: number;
      }>(`/videos/${videoId}/quiz/submit`, { answers })).data,
    onSuccess: (_d, vars) => {
      if (vars.courseId) qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] });
    },
  });
}

export interface VideoCourseExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number; // faqat admin/teacher uchun
}

export function useCourseExam(courseId: string | undefined) {
  return useQuery({
    queryKey: ["courseExam", courseId],
    enabled: !!courseId,
    queryFn: async () => (await api.get<VideoCourseExamQuestion[]>(`/video-courses/${courseId}/exam`)).data,
  });
}

export function useAddExamQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, ...body }: { courseId: string; question: string; options: string[]; correctIndex: number }) =>
      (await api.post<{ id: string }>(`/video-courses/${courseId}/exam`, body)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["courseExam", vars.courseId] }),
  });
}

export function useDeleteExamQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string; courseId: string }) =>
      (await api.delete(`/video-courses/exam/${questionId}`)).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["courseExam", vars.courseId] }),
  });
}

export function useSubmitCourseExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, answers }: { courseId: string; answers: number[] }) =>
      (await api.post<{ score: number; total: number; courseXpAwarded?: number }>(`/video-courses/${courseId}/exam/submit`, { answers })).data,
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["video-course", vars.courseId] }),
  });
}

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
  meetingPlatform: "zoom" | "meet";
  lessonType?: "guruh" | "individual" | "diagnostika";
  customName?: string | null;
  teacherName: string | null;
  teacherPhone: string | null;
  nextAt: string;
  endsAt: string;
  isLive: boolean;
  endedToday: boolean;
  teacherRating: number | null;
  teacherStudentsCount: number;
}

export function useNextLesson() {
  return useQuery({
    queryKey: ["nextLesson"],
    queryFn: async () => (await api.get<NextLesson | null>("/me/schedule/next")).data,
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
    mutationFn: async (payload: { groupId: string; title: string; description?: string; dueDate?: string; xpReward?: number }) =>
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

// ─── Applications ─────────────────────────────────────────────────────────────

export interface Application {
  id: string;
  fullName: string;
  phone: string;
  age: number | null;
  level: string | null;
  source: "telegram" | "website" | "phone" | "referral" | "instagram" | "other";
  note: string | null;
  status: "diagnostika" | "royxatdan_otdi" | "rad";
  assignedTo: string | null;
  assignedToName: string | null;
  convertedStudentId: string | null;
  diagnosticTeacherId: string | null;
  diagnosticTeacherName: string | null;
  diagnosticDate: string | null;
  diagnosticTime: string | null;
  meetingPlatform: "zoom" | "meet";
  meetingUrl: string | null;
  scheduleSlotId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStats {
  diagnostika: number; royxatdan_otdi: number; rad: number;
}

export function useApplications(status?: string) {
  return useQuery({
    queryKey: ["applications", status],
    queryFn: async () =>
      (await api.get<Application[]>("/applications", { params: status ? { status } : {} })).data,
  });
}

export function useApplicationStats() {
  return useQuery({
    queryKey: ["applications", "stats"],
    queryFn: async () => (await api.get<ApplicationStats>("/applications/stats")).data,
  });
}

export interface ApplicationCreatePayload {
  fullName: string; phone: string; age?: number; level?: string; source?: string; note?: string;
  diagnosticTeacherId?: string; diagnosticDate?: string; diagnosticTime?: string;
  meetingPlatform?: "zoom" | "meet"; meetingUrl?: string;
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: ApplicationCreatePayload) =>
      (await api.post<{ id: string; studentId: string | null; tempPassword: string | null }>("/applications", p)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export interface ApplicationUpdatePayload {
  id: string; status?: string; note?: string; assignedTo?: string;
  fullName?: string; phone?: string; age?: number; level?: string;
  diagnosticTeacherId?: string | null; diagnosticDate?: string | null; diagnosticTime?: string | null;
  meetingPlatform?: "zoom" | "meet"; meetingUrl?: string | null;
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ApplicationUpdatePayload) =>
      (await api.patch<{ ok: true; studentId: string | null; tempPassword: string | null }>(`/applications/${id}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useConvertApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ studentId: string; tempPassword: string }>(`/applications/${id}/convert`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/applications/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

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
  retentionCoef: number;
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
    mutationFn: async (body: { fullName: string; phone: string; role: StaffRole }) =>
      (await api.post("/staff", body)).data as { id: string; tempPassword: string },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; fullName?: string; phone?: string; isActive?: boolean }) =>
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
