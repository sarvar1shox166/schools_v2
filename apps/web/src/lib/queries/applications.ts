import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

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

