import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

// ─── Leads (landing sahifadan kelgan xom so'rovlar) ────────────────────────────

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  age: number | null;
  ageRange: string | null;
  preferredDays: string | null;
  level: string | null;
  status: "yangi" | "otkazildi" | "rad";
  convertedApplicationId: string | null;
  createdAt: string;
}

export interface LeadStats {
  yangi: number; otkazildi: number; rad: number;
}

export function useLeads(status?: string) {
  return useQuery({
    queryKey: ["leads", status],
    queryFn: async () => (await api.get<Lead[]>("/leads", { params: status ? { status } : {} })).data,
  });
}

export function useLeadStats() {
  return useQuery({
    queryKey: ["leads", "stats"],
    queryFn: async () => (await api.get<LeadStats>("/leads/stats")).data,
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "yangi" | "rad" }) =>
      (await api.patch(`/leads/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export interface LeadConvertPayload {
  id: string;
  diagnosticTeacherId: string; diagnosticDate: string; diagnosticTime: string;
  meetingPlatform: "zoom" | "meet"; meetingUrl?: string;
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: LeadConvertPayload) =>
      (await api.post<{ applicationId: string; studentId: string; tempPassword: string }>(`/leads/${id}/convert`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
