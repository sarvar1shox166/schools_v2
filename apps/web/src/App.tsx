import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage.js";
import AdminDashboard from "./pages/admin/AdminDashboard.js";
import TeachersPage from "./pages/admin/TeachersPage.js";
import StudentsPage from "./pages/admin/StudentsPage.js";
import GroupsPage from "./pages/admin/GroupsPage.js";
import SchedulePage from "./pages/admin/SchedulePage.js";
import AttendancePage from "./pages/admin/AttendancePage.js";
import PaymentsPage from "./pages/admin/PaymentsPage.js";
import IncomeReportPage from "./pages/admin/IncomeReportPage.js";
import NotificationsPage from "./pages/admin/NotificationsPage.js";
import BroadcastPage from "./pages/admin/BroadcastPage.js";
import ReportsPage from "./pages/admin/ReportsPage.js";
import ApplicationsPage from "./pages/admin/ApplicationsPage.js";
import TeacherRatingPage from "./pages/admin/TeacherRatingPage.js";
import VideoCoursesPage from "./pages/admin/VideoCoursesPage.js";
import VideoCourseDetailPage from "./pages/admin/VideoCourseDetailPage.js";
import SettingsPage from "./pages/admin/SettingsPage.js";
import TeacherDashboard from "./pages/teacher/TeacherDashboard.js";
import TeacherIncomePage from "./pages/teacher/TeacherIncomePage.js";
import TStudentsPage from "./pages/teacher/TStudentsPage.js";
import TProgressPage from "./pages/teacher/TProgressPage.js";
import TProfilePage from "./pages/teacher/TProfilePage.js";
import TMaterialsPage from "./pages/teacher/TMaterialsPage.js";
import TMessagesPage from "./pages/teacher/TMessagesPage.js";
import TNotificationsPage from "./pages/teacher/TNotificationsPage.js";
import TPuzzlesPage from "./pages/teacher/TPuzzlesPage.js";
import TPuzzleCreatePage from "./pages/teacher/TPuzzleCreatePage.js";
import TSchedulePage from "./pages/teacher/TSchedulePage.js";
import TAttendancePage from "./pages/teacher/TAttendancePage.js";
import StudentDashboard from "./pages/student/StudentDashboard.js";
import PuzzlesPage from "./pages/student/PuzzlesPage.js";
import LeaderboardPage from "./pages/student/LeaderboardPage.js";
import PvpPage from "./pages/student/PvpPage.js";
import PvpGamePage from "./pages/student/PvpGamePage.js";
import VideosPage from "./pages/student/VideosPage.js";
import VideoWatchPage from "./pages/student/VideoWatchPage.js";
import LessonsPage from "./pages/student/LessonsPage.js";
import LearnPage from "./pages/student/LearnPage.js";
import LearnLessonPage from "./pages/student/LearnLessonPage.js";
import ProfilePage from "./pages/student/ProfilePage.js";
import { RequireAuth } from "./layouts/RequireAuth.js";
import { AppShell } from "./layouts/AppShell.js";
import type { NavSection } from "./layouts/Sidebar.js";

const ADMIN_NAV: NavSection[] = [
  {
    group: "Asosiy",
    items: [
      { to: "/admin",          label: "Dashboard",     icon: "dashboard" },
      { to: "/admin/schedule", label: "Dars vaqtlari", icon: "clock" },
    ],
  },
  {
    group: "Boshqaruv",
    items: [
      { to: "/admin/applications",   label: "Arizalar",         icon: "user",       badge: 2 },
      { to: "/admin/teachers",       label: "O'qituvchilar",    icon: "teacher" },
      { to: "/admin/students",       label: "O'quvchilar",      icon: "students",   badge: 12 },
      { to: "/admin/groups",         label: "Guruhlar",         icon: "groups" },
      { to: "/admin/attendance",     label: "Davomat",          icon: "attendance" },
      { to: "/admin/video-courses",   label: "Video darsliklar", icon: "video" },
      { to: "/admin/teacher-rating", label: "Ustoz reytingi",   icon: "award" },
    ],
  },
  {
    group: "Moliya",
    items: [
      { to: "/admin/payments", label: "To'lovlar",  icon: "payments", badge: 3 },
      { to: "/admin/income",   label: "Daromadlar", icon: "income" },
    ],
  },
  {
    group: "Tizim",
    items: [
      { to: "/admin/broadcast",     label: "Ommaviy xabar",    icon: "message" },
      { to: "/admin/notifications", label: "Bildirishnomalar", icon: "bell",    badge: 3 },
      { to: "/admin/reports",       label: "Hisobotlar",       icon: "reports" },
      { to: "/admin/settings",      label: "Sozlamalar",       icon: "settings" },
    ],
  },
];

const TEACHER_NAV: NavSection[] = [
  {
    group: "Asosiy",
    items: [
      { to: "/teacher",          label: "Dashboard",     icon: "dashboard" },
      { to: "/teacher/schedule", label: "Darslarim",     icon: "calendarCheck" },
      { to: "/teacher/students", label: "O'quvchilarim", icon: "students" },
    ],
  },
  {
    group: "Dars",
    items: [
      { to: "/teacher/attendance", label: "Davomat belgilash", icon: "attendance" },
      { to: "/teacher/progress",   label: "O'quvchi natijasi", icon: "target" },
      { to: "/teacher/materials",  label: "Uy vazifalari",     icon: "bookOpen" },
      { to: "/teacher/puzzles",    label: "Boshqotirmalar",    icon: "puzzle" },
    ],
  },
  {
    group: "Muloqot",
    items: [
      { to: "/teacher/notifications", label: "Bildirishnomalar", icon: "bell", badge: 3 },
    ],
  },
  {
    group: "Profil",
    items: [
      { to: "/teacher/profile", label: "Mening profilim", icon: "user" },
    ],
  },
];

const STUDENT_NAV: NavSection[] = [
  {
    group: "Asosiy",
    items: [
      { to: "/student",            label: "Bosh sahifa",    icon: "dashboard",   emoji: "🏠", navId: "home" },
      { to: "/student/lessons",    label: "Darslarim",      icon: "calendarCheck",emoji: "📅", navId: "schedule" },
      { to: "/student/videos",     label: "Video darslar",  icon: "video",       emoji: "🎬", navId: "video" },
      { to: "/student/learn",      label: "O'rganish",      icon: "bookOpen",    emoji: "📚", navId: "learn" },
      { to: "/student/puzzles",    label: "Boshqotirmalar", icon: "pieces",      emoji: "🧩", navId: "puzzle" },
      { to: "/student/pvp",        label: "O'ynash",        icon: "zap",         emoji: "♟", navId: "chess" },
      { to: "/student/leaderboard",label: "Reyting",        icon: "award",       emoji: "🏆", navId: "leaderboard" },
      { to: "/student/profile",    label: "Profilim",       icon: "user",        emoji: "👤", navId: "profile" },
    ],
  },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth roles={["super_admin", "admin"]} />}>
        <Route element={<AppShell title="Admin paneli" nav={ADMIN_NAV} />}>
          <Route path="/admin"                element={<AdminDashboard />} />
          <Route path="/admin/teachers"       element={<TeachersPage />} />
          <Route path="/admin/students"       element={<StudentsPage />} />
          <Route path="/admin/groups"         element={<GroupsPage />} />
          <Route path="/admin/schedule"       element={<SchedulePage />} />
          <Route path="/admin/attendance"     element={<AttendancePage />} />
          <Route path="/admin/payments"       element={<PaymentsPage />} />
          <Route path="/admin/income"         element={<IncomeReportPage />} />
          <Route path="/admin/applications"   element={<ApplicationsPage />} />
          <Route path="/admin/teacher-rating"           element={<TeacherRatingPage />} />
          <Route path="/admin/video-courses"           element={<VideoCoursesPage />} />
          <Route path="/admin/video-courses/:courseId" element={<VideoCourseDetailPage />} />
          <Route path="/admin/broadcast"               element={<BroadcastPage />} />
          <Route path="/admin/notifications"  element={<NotificationsPage />} />
          <Route path="/admin/reports"        element={<ReportsPage />} />
          <Route path="/admin/settings"       element={<SettingsPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth roles={["teacher"]} />}>
        <Route element={<AppShell title="O'qituvchi paneli" nav={TEACHER_NAV} />}>
          <Route path="/teacher"                element={<TeacherDashboard />} />
          <Route path="/teacher/income"         element={<TeacherIncomePage />} />
          <Route path="/teacher/schedule"       element={<TSchedulePage />} />
          <Route path="/teacher/attendance"     element={<TAttendancePage />} />
          <Route path="/teacher/students"       element={<TStudentsPage />} />
          <Route path="/teacher/progress"       element={<TProgressPage />} />
          <Route path="/teacher/materials"      element={<TMaterialsPage />} />
          <Route path="/teacher/puzzles"        element={<TPuzzlesPage />} />
          <Route path="/teacher/puzzles/new"   element={<TPuzzleCreatePage />} />
          <Route path="/teacher/messages"       element={<TMessagesPage />} />
          <Route path="/teacher/notifications"  element={<TNotificationsPage />} />
          <Route path="/teacher/profile"        element={<TProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth roles={["student"]} />}>
        <Route element={<AppShell title="O'quvchi paneli" nav={STUDENT_NAV} />}>
          <Route path="/student"                       element={<StudentDashboard />} />
          <Route path="/student/learn"                 element={<LearnPage />} />
          <Route path="/student/learn/:lessonId"       element={<LearnLessonPage />} />
          <Route path="/student/lessons"               element={<LessonsPage />} />
          <Route path="/student/puzzles"               element={<PuzzlesPage />} />
          <Route path="/student/videos"                element={<VideosPage />} />
          <Route path="/student/videos/watch/:videoId" element={<VideoWatchPage />} />
          <Route path="/student/pvp"                   element={<PvpPage />} />
          <Route path="/student/pvp/game"              element={<PvpGamePage />} />
          <Route path="/student/leaderboard"           element={<LeaderboardPage />} />
          <Route path="/student/profile"               element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
