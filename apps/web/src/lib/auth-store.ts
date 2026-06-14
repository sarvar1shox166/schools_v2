import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "super_admin" | "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  tenantId: string | null;
  branchId: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "chess-school-auth" }
  )
);
