import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

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

