import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import type { StudentGroupRef } from "./core.js";

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

