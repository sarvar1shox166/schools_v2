import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuthStore, type Role } from "../../lib/auth-store.js";
import { getTelegramInitData, getTelegramWebApp } from "../../lib/telegram.js";

const ROLE_HOME: Record<Role, string> = {
  super_admin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/* ── Inject animation keyframes once ───────────────────────────────────── */
function useLoginStyles() {
  useEffect(() => {
    const id = "login-anim";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes lg-card  { from { opacity:0; transform:translateY(28px) scale(.96) } to { opacity:1; transform:translateY(0) scale(1) } }
      @keyframes lg-left  { from { opacity:0; transform:translateX(-22px) } to { opacity:1; transform:translateX(0) } }
      @keyframes lg-right { from { opacity:0; transform:translateX(22px)  } to { opacity:1; transform:translateX(0) } }
      @keyframes lg-float { 0%,100%{ transform:translateY(0)   } 50%{ transform:translateY(-11px) } }
      @keyframes lg-king  { 0%,100%{ transform:translateY(0) rotate(-2deg) } 50%{ transform:translateY(-9px) rotate(2deg) } }
      @keyframes lg-glyph1{ 0%,100%{ transform:translateY(0) rotate(0deg)  } 50%{ transform:translateY(-14px) rotate(6deg)  } }
      @keyframes lg-glyph2{ 0%,100%{ transform:translateY(0) rotate(0deg)  } 50%{ transform:translateY(-8px)  rotate(-5deg) } }
      @keyframes lg-glyph3{ 0%,100%{ transform:translateY(0) rotate(0deg)  } 50%{ transform:translateY(-10px) rotate(4deg)  } }
      @keyframes lg-field { 0%,100%{ opacity:.7 } 50%{ opacity:1 } }
    `;
    document.head.appendChild(el);
  }, []);
}

const S: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: `
      radial-gradient(900px 500px at 12% 10%, #efe9ff, transparent 60%),
      radial-gradient(900px 500px at 90% 95%, #ece4ff, transparent 60%),
      #f5f2ff
    `,
    padding: 24,
  },
  card: {
    width: "min(960px, 100%)",
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
    background: "#fff",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 40px 90px -30px rgba(79,20,242,.4), 0 8px 30px -12px rgba(0,0,0,.15)",
  },
  left: {
    position: "relative",
    overflow: "hidden",
    color: "#fff",
    background: "linear-gradient(155deg,#5a20ff 0%,#4f14f2 50%,#3a0bc4 100%)",
    padding: "48px 44px",
    display: "flex",
    flexDirection: "column",
  },
  right: {
    padding: "48px 52px",
    display: "flex",
    flexDirection: "column",
  },
};

export default function LoginPage() {
  useLoginStyles();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
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
    api.post("/auth/telegram", { initData })
      .then(({ data }) => { setSession(data); navigate(ROLE_HOME[data.user.role as Role]); })
      .catch(() => setError("Telegram hisobingiz tizimga ulanmagan. Telefon raqam orqali kiring."))
      .finally(() => setTgChecking(false));
  }, [navigate, setSession]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { login, password });
      setSession(data);
      navigate(ROLE_HOME[data.user.role as Role]);
    } catch {
      setError("Login yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  }

  if (tgChecking) {
    return (
      <div style={{ ...S.body }}>
        <div style={{ color: "#6b6480", fontSize: 15, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          Telegram orqali tekshirilmoqda...
        </div>
      </div>
    );
  }

  return (
    <div style={S.body}>
      <div style={{ ...S.card, animation: "lg-card .55s cubic-bezier(.16,1,.3,1) both" }}>

        {/* ── LEFT ─────────────────────────────────────────────────────── */}
        <div style={{ ...S.left, animation: "lg-left .6s .08s cubic-bezier(.16,1,.3,1) both" }}>
          {/* Floating chess glyphs */}
          <span style={{ position:"absolute", color:"rgba(255,255,255,.10)", zIndex:1, userSelect:"none", pointerEvents:"none", fontSize:120, right:30, top:-14, animation:"lg-glyph1 6s ease-in-out infinite" }}>♞</span>
          <span style={{ position:"absolute", color:"rgba(255,255,255,.08)", zIndex:1, userSelect:"none", pointerEvents:"none", fontSize:70, right:130, bottom:30, animation:"lg-glyph2 5s 1s ease-in-out infinite" }}>♟</span>
          <span style={{ position:"absolute", color:"rgba(255,255,255,.07)", zIndex:1, userSelect:"none", pointerEvents:"none", fontSize:46, left:24, bottom:120, animation:"lg-glyph3 7s 0.5s ease-in-out infinite" }}>♜</span>

          {/* Wave divider on right edge */}
          <svg style={{ position:"absolute", top:0, right:-2, height:"100%", width:120, pointerEvents:"none" }}
            viewBox="0 0 120 600" preserveAspectRatio="none">
            <path style={{ fill:"#fff", opacity:.12 }} d="M120,0 C40,80 90,180 50,300 C10,420 80,520 120,600 L120,600 L120,0 Z"/>
            <path style={{ fill:"#fff", opacity:.18 }} d="M120,0 C60,90 100,200 64,310 C30,430 96,520 120,600 L120,600 L120,0 Z"/>
            <path style={{ fill:"#fff", opacity:1   }} d="M120,0 C78,90 112,210 86,320 C58,440 104,530 120,600 L120,600 L120,0 Z"/>
          </svg>

          {/* Brand */}
          <div style={{ position:"relative", zIndex:2 }}>
            <div style={{ fontSize:15, fontWeight:600, letterSpacing:".18em", textTransform:"uppercase", color:"rgba(255,255,255,.85)" }}>
              Xush kelibsiz
            </div>
            <div style={{ fontSize:40, fontWeight:800, letterSpacing:"-.02em", marginTop:6, lineHeight:1 }}>
              chess<span style={{ color:"#d9ccff" }}>.up</span>
            </div>
            <div style={{ fontSize:13.5, fontWeight:600, color:"rgba(255,255,255,.7)", marginTop:8, letterSpacing:".02em" }}>
              Online shaxmat maktabi
            </div>
          </div>

          {/* King badge — chess illustration */}
          <div style={{ position:"relative", zIndex:2, width:170, height:170, display:"grid", placeItems:"center", margin:"30px 0 22px" }}>
            <div style={{
              fontSize: 120, lineHeight: 1,
              filter: "drop-shadow(0 14px 28px rgba(0,0,0,.35))",
              opacity: .85, userSelect: "none",
              animation: "lg-king 4s ease-in-out infinite",
            }}>♚</div>
            <span style={{ position:"absolute", bottom:10, left:10, fontSize:36, opacity:.6, animation:"lg-float 3.5s .3s ease-in-out infinite" }}>♟</span>
            <span style={{ position:"absolute", bottom:10, right:10, fontSize:36, opacity:.6, animation:"lg-float 3.5s .8s ease-in-out infinite" }}>♙</span>
            <span style={{ position:"absolute", top:10, left:20, fontSize:28, opacity:.4, animation:"lg-float 4s 1.2s ease-in-out infinite" }}>♞</span>
          </div>

          {/* Description */}
          <p style={{ position:"relative", zIndex:2, fontSize:14, lineHeight:1.7, color:"rgba(255,255,255,.82)", maxWidth:330, fontWeight:500, margin:0 }}>
            Hisobingizga kiring va shaxmat sayohatingizni davom ettiring.
            Darslar, boshqotirmalar va jonli o'yinlar sizni kutmoqda!
          </p>

          {/* Footer links */}
          <div style={{ position:"relative", zIndex:2, marginTop:"auto", paddingTop:34, display:"flex", gap:18, alignItems:"center" }}>
            <a href="#" style={{ color:"rgba(255,255,255,.8)", fontSize:12, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", textDecoration:"none" }}>Biz haqimizda</a>
            <span style={{ width:1, height:13, background:"rgba(255,255,255,.3)", display:"inline-block" }}/>
            <a href="#" style={{ color:"rgba(255,255,255,.8)", fontSize:12, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", textDecoration:"none" }}>Yordam</a>
          </div>
        </div>

        {/* ── RIGHT ────────────────────────────────────────────────────── */}
        <div style={{ ...S.right, animation: "lg-right .6s .14s cubic-bezier(.16,1,.3,1) both" }}>
          {/* Logo */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:26 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:48, height:48, borderRadius:12,
                background:"linear-gradient(135deg,#5a20ff,#4f14f2)",
                display:"grid", placeItems:"center",
                fontSize:24, color:"#fff",
                boxShadow:"0 4px 16px rgba(79,20,242,.35)",
              }}>♟</div>
              <div>
                <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-.02em", color:"#4f14f2", lineHeight:1 }}>
                  chess<span style={{ color:"#7a4cff" }}>.up</span>
                </div>
                <div style={{ fontSize:10, fontWeight:600, color:"#a79fc4", letterSpacing:".06em", marginTop:2 }}>
                  online shaxmat maktabi
                </div>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ fontSize:25, fontWeight:800, color:"#1a1530", textAlign:"center", letterSpacing:"-.01em" }}>
            Tizimga kirish
          </div>
          <div style={{ fontSize:13.5, color:"#6b6480", textAlign:"center", marginTop:7, fontWeight:500 }}>
            Login va parolingizni kiriting
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginTop:30, display:"flex", flexDirection:"column", gap:18 }}>

            {/* Login */}
            <div>
              <label htmlFor="login-field" style={{ display:"block", fontSize:13, fontWeight:700, color:"#1a1530", marginBottom:8 }}>Login</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:15, top:"50%", transform:"translateY(-50%)", color:"#4f14f2", opacity:.65, display:"flex", pointerEvents:"none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/>
                  </svg>
                </span>
                <input
                  id="login-field"
                  type="text"
                  placeholder="Loginingizni kiriting"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  autoComplete="username"
                  required
                  style={{
                    width:"100%", height:50, borderRadius:13,
                    border:"1.5px solid #e3dcfa",
                    background:"#f1eefb",
                    padding:"0 16px 0 44px",
                    fontSize:14.5, fontWeight:600, color:"#1a1530",
                    fontFamily:"inherit", outline:"none",
                    transition:"all .18s", boxSizing:"border-box",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor="#4f14f2"; e.currentTarget.style.background="#fff"; e.currentTarget.style.boxShadow="0 0 0 4px rgba(79,20,242,.12)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor="#e3dcfa"; e.currentTarget.style.background="#f1eefb"; e.currentTarget.style.boxShadow="none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="pass-field" style={{ display:"block", fontSize:13, fontWeight:700, color:"#1a1530", marginBottom:8 }}>Parol</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:15, top:"50%", transform:"translateY(-50%)", color:"#4f14f2", opacity:.65, display:"flex", pointerEvents:"none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>
                  </svg>
                </span>
                <input
                  id="pass-field"
                  type={showPass ? "text" : "password"}
                  placeholder="Parolingizni kiriting"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{
                    width:"100%", height:50, borderRadius:13,
                    border:"1.5px solid #e3dcfa",
                    background:"#f1eefb",
                    padding:"0 50px 0 44px",
                    fontSize:14.5, fontWeight:600, color:"#1a1530",
                    fontFamily:"inherit", outline:"none",
                    transition:"all .18s", boxSizing:"border-box",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor="#4f14f2"; e.currentTarget.style.background="#fff"; e.currentTarget.style.boxShadow="0 0 0 4px rgba(79,20,242,.12)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor="#e3dcfa"; e.currentTarget.style.background="#f1eefb"; e.currentTarget.style.boxShadow="none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  aria-label="Parolni ko'rsatish"
                  style={{
                    position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                    width:34, height:34, border:"none", background:"none",
                    cursor:"pointer", color:"#a79fc4", display:"grid", placeItems:"center",
                    borderRadius:8, transition:"all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color="#4f14f2"; e.currentTarget.style.background="rgba(79,20,242,.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color="#a79fc4"; e.currentTarget.style.background="none"; }}
                >
                  {showPass ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18"/>
                      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2"/>
                      <path d="M9.4 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.3 4.1"/>
                      <path d="M6.2 6.2A17.6 17.6 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 3.4-.6"/>
                    </svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:-4 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:"#6b6480", cursor:"pointer", userSelect:"none" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ width:17, height:17, accentColor:"#4f14f2", cursor:"pointer" }}
                />
                Meni eslab qol
              </label>
              <a href="#" style={{ fontSize:13, fontWeight:700, color:"#4f14f2", textDecoration:"none" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>
                Parolni unutdingizmi?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding:"10px 14px", borderRadius:10,
                background:"#fff0f0", border:"1px solid #ffd0d0",
                color:"#c0392b", fontSize:13, fontWeight:600,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height:52, border:"none", borderRadius:13, cursor: loading ? "not-allowed" : "pointer",
                marginTop:6,
                background: loading ? "#a79fc4" : "linear-gradient(135deg,#5a20ff,#4f14f2)",
                color:"#fff", fontSize:15.5, fontWeight:800,
                fontFamily:"inherit", letterSpacing:".01em",
                boxShadow: loading ? "none" : "0 14px 28px -10px rgba(79,20,242,.6)",
                transition:"all .2s",
                display:"flex", alignItems:"center", justifyContent:"center", gap:9,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 18px 34px -10px rgba(79,20,242,.7)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=loading?"none":"0 14px 28px -10px rgba(79,20,242,.6)"; }}
            >
              {loading ? "Kirilmoqda..." : (
                <>
                  Kirish
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div style={{ textAlign:"center", fontSize:13.5, color:"#6b6480", fontWeight:500, marginTop:22 }}>
            Hisobingiz yo'qmi?{" "}
            <a href="#" style={{ color:"#4f14f2", fontWeight:800, textDecoration:"none" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration="underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration="none"}>
              Ro'yxatdan o'tish
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
