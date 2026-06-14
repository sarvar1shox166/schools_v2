import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Icon } from "@chess-school/ui";
import { api } from "../../lib/api.js";
import { useAuthStore, type Role } from "../../lib/auth-store.js";
import { getTelegramInitData, getTelegramWebApp } from "../../lib/telegram.js";

const ROLE_HOME: Record<Role, string> = {
  super_admin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tgChecking, setTgChecking] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;
    webApp.ready();
    webApp.expand();

    const initData = getTelegramInitData();
    if (!initData) return;

    setTgChecking(true);
    api
      .post("/auth/telegram", { initData })
      .then(({ data }) => {
        setSession(data);
        navigate(ROLE_HOME[data.user.role as Role]);
      })
      .catch(() => {
        setError("Telegram hisobingiz tizimga ulanmagan. Iltimos, telefon raqam orqali kiring.");
      })
      .finally(() => setTgChecking(false));
  }, [navigate, setSession]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { phone, password });
      setSession(data);
      navigate(ROLE_HOME[data.user.role as Role]);
    } catch {
      setError("Telefon raqam yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  }

  if (tgChecking) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg)" }}>
        <div className="brand-sub">Telegram orqali tekshirilmoqda...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <Card style={{ width: 360, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div className="brand-mark">♞</div>
          <div>
            <div className="brand-name">Shaxmat Online</div>
            <div className="brand-sub">Tizimga kirish</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="search">
            <Icon name="phone" size={17} />
            <input
              placeholder="+998 XX XXX XX XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <label className="search">
            <Icon name="user" size={17} />
            <input
              type="password"
              placeholder="Parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="badge dang">{error}</div>}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>
      </Card>
    </div>
  );
}
