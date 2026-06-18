import axios from "axios";
import { useAuthStore } from "./auth-store.js";

export const api = axios.create({
  baseURL: "/api/v1",
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — try refresh once, then retry original request
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Don't retry refresh calls themselves (avoid infinite loop)
    if (error.response?.status !== 401 || original._retried || original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    original._retried = true;

    // Deduplicate concurrent 401s — only one refresh call at a time
    if (!refreshing) {
      refreshing = (async () => {
        const { refreshToken, setSession, logout, user } = useAuthStore.getState();
        if (!refreshToken) {
          logout();
          return null;
        }
        try {
          const res = await axios.post<{ accessToken: string; refreshToken: string }>(
            "/api/v1/auth/refresh",
            { refreshToken }
          );
          const { accessToken, refreshToken: newRefresh } = res.data;
          setSession({ accessToken, refreshToken: newRefresh, user: user! });
          return accessToken;
        } catch {
          logout();
          return null;
        } finally {
          refreshing = null;
        }
      })();
    }

    const newToken = await refreshing;
    if (!newToken) return Promise.reject(error);

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);
