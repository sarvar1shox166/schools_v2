export type Role = "super_admin" | "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  tenantId: string | null;
  branchId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
