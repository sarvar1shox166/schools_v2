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
  rating: number;
}

export interface StudentGroupRef {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
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
}

export interface ScheduleSlot {
  id: string;
  groupId: string;
  groupName: string;
  color: string | null;
  dayOfWeek: number;
  startTime: string;
  roomId: string | null;
  roomName: string | null;
  teacherName: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
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
  avgRating: number;
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
  groupName: string | null;
  groupColor: string | null;
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
    mutationFn: async (payload: { name: string; level?: string; teacherId?: string; color?: string; capacity?: number }) =>
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

export function useCreateScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { groupId: string; dayOfWeek: number; startTime: string; roomId?: string; isOnline?: boolean; meetingUrl?: string }) =>
      (await api.post("/schedule", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

export function useUpdateScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; dayOfWeek?: number; startTime?: string; roomId?: string; isOnline?: boolean; meetingUrl?: string }) =>
      (await api.patch(`/schedule/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
  });
}

export function useDeleteScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schedule/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule"] }),
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

export function useAssignPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { studentId: string; packageId: string; method: "click" | "payme" | "naqd" | "uzcard"; expiresAt?: string }) =>
      (await api.post("/student-packages", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["studentPackages"] });
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

export interface Puzzle {
  id: string;
  fen: string;
  difficulty: "oson" | "orta" | "qiyin";
  xpReward: number;
  title?: string | null;
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
  fullName: string;
  xp: number;
  level: number;
  streak: number;
  elo: number;
}

export function useDailyPuzzle() {
  return useQuery({
    queryKey: ["dailyPuzzle"],
    queryFn: async () => (await api.get<Puzzle | null>("/puzzles/daily")).data,
  });
}

export function usePuzzles() {
  return useQuery({
    queryKey: ["puzzles"],
    queryFn: async () => (await api.get<Puzzle[]>("/puzzles")).data,
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
    }) => (await api.post<{ id: string }>("/puzzles", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPuzzles"] }),
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
      }
    },
  });
}

export function useMyXp() {
  return useQuery({
    queryKey: ["myXp"],
    queryFn: async () => (await api.get<MyXp>("/me/xp")).data,
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

export interface VideoLesson {
  id: string;
  title: string;
  category: "zoom" | "debyut" | "taktika" | "endshpil" | "strategiya";
  videoUrl: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  thumbnailColor: string | null;
  thumbnailIcon: string | null;
  progressPct: number;
}

export function useVideos(category?: string) {
  return useQuery({
    queryKey: ["videos", category],
    queryFn: async () => (await api.get<VideoLesson[]>("/videos", { params: category ? { category } : {} })).data,
  });
}

export function useCreateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string; category: string; videoUrl: string;
      durationSeconds?: number; thumbnailUrl?: string;
      thumbnailColor?: string; thumbnailIcon?: string;
    }) => (await api.post("/videos", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/videos/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
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
    mutationFn: async ({ videoId, progressPct }: { videoId: string; progressPct: number }) =>
      (await api.post(`/videos/${videoId}/progress`, { progressPct })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export interface NextLesson {
  id: string;
  groupId: string;
  groupName: string;
  color: string | null;
  dayOfWeek: number;
  startTime: string;
  isOnline: boolean;
  meetingUrl: string | null;
  teacherName: string | null;
  teacherPhone: string | null;
  nextAt: string;
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
  done: boolean;
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
  source: "telegram" | "website" | "phone" | "referral" | "other";
  note: string | null;
  status: "yangi" | "korildi" | "qabul" | "rad";
  assignedTo: string | null;
  assignedToName: string | null;
  convertedStudentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStats {
  yangi: number; korildi: number; qabul: number; rad: number;
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

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { fullName: string; phone: string; age?: number; level?: string; source?: string; note?: string }) =>
      (await api.post<{ id: string }>("/applications", p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; status?: string; note?: string; assignedTo?: string }) =>
      (await api.patch(`/applications/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
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

export interface PricingTier {
  id: string;
  name: string;
  color: string;
  groupMonthly: number;
  individualPerLesson: number;
  sortOrder: number;
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

export function usePricingTiers() {
  return useQuery({
    queryKey: ["settings", "pricing"],
    queryFn: async () => (await api.get<PricingTier[]>("/settings/pricing")).data,
  });
}

export function useCreatePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<PricingTier, "id">) =>
      (await api.post<{ id: string }>("/settings/pricing", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "pricing"] }),
  });
}

export function useUpdatePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PricingTier> & { id: string }) =>
      (await api.patch(`/settings/pricing/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "pricing"] }),
  });
}

export function useDeletePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/settings/pricing/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "pricing"] }),
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
    mutationFn: async ({ id, ...body }: { id: string; name?: string; level?: string; teacherId?: string; color?: string; capacity?: number }) =>
      (await api.patch(`/groups/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; fullName?: string; phone?: string; level?: string; age?: number; status?: string }) =>
      (await api.patch(`/students/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
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

// ─── Staff hooks ──────────────────────────────────────────────────────────────
export interface StaffMember {
  id: string;
  fullName: string;
  phone: string;
  login: string;
  role: "operator" | "accountant" | "admin";
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
    mutationFn: async (body: { fullName: string; phone: string; role: "operator" | "accountant" | "admin" }) =>
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
