import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

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

