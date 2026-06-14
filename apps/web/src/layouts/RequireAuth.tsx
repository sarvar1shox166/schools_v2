import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, type Role } from "../lib/auth-store.js";

export function RequireAuth({ roles }: { roles: Role[] }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;

  return <Outlet />;
}
