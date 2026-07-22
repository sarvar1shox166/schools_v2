import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Card, fmtSom, Icon } from "@chess-school/ui";
import {
  useAttendance,
  useJoinTeacherLesson,
  useMarkAttendance,
  useMyIncome,
  useMyLessons,
  useMyProfile,
  useMyStudents,
  useMyStudentsProgress,
  useTodaySchedule,
} from "../../lib/queries.js";

/* ─── helpers ─── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function nowMins() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function calcRemaining(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
}

function useCountdown(timeStr: string | undefined) {
  const [secs, setSecs] = useState(() => calcRemaining(timeStr));
  useEffect(() => {
    setSecs(calcRemaining(timeStr));
    if (!timeStr) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [timeStr]);
  const h   = Math.floor(secs / 3600);
  const min = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;
  return {
    h:   String(h).padStart(2, "0"),
    m:   String(min).padStart(2, "0"),
    s:   String(sec).padStart(2, "0"),
  };
}

/* ─── page ─── */
export default function TeacherDashboard() {
  const navigate  = useNavigate();
  const date      = todayStr();

  const { data: profile }       = useMyProfile();
  const { data: todaySchedule } = useTodaySchedule();
  const { data: myStudents }    = useMyStudents();
  const { data: lessons }       = useMyLessons();
  const { data: progressData }  = useMyStudentsProgress("attendance");
  const { data: income }        = useMyIncome(currentPeriod());

  const todayLessons = useMemo(
    () => lessons?.filter(l => l.date.slice(0, 10) === date) ?? [],
    [lessons, date],
  );

  /* student-count lookup by group name */
  const studentsMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of todayLessons) m[l.groupName] = l.studentsCount;
    return m;
  }, [todayLessons]);

  /* live / current / upcoming lesson from today's schedule */
  const nm = nowMins();
  const liveLesson = useMemo(() => {
    if (!todaySchedule) return undefined;
    return todaySchedule.find(s => {
      const [h, mi] = s.startTime.split(":").map(Number);
      const start = h * 60 + mi;
      return nm >= start && nm < start + (s.durationMinutes ?? 90) && !s.isEnded;
    });
  }, [todaySchedule, nm]);
  const upcomingLesson = useMemo(() => {
    if (!todaySchedule) return undefined;
    return todaySchedule.find(s => {
      const [h, mi] = s.startTime.split(":").map(Number);
      return h * 60 + mi > nm;
    });
  }, [todaySchedule, nm]);
  const nextLesson = liveLesson ?? upcomingLesson;
  const noLessonToday = todaySchedule !== undefined && !liveLesson && !upcomingLesson;

  const joinTeacherLesson = useJoinTeacherLesson();

  /* attendance for first slot */
  const firstSlot = todaySchedule?.[0];
  const { data: records } = useAttendance(firstSlot?.id ?? null, date);
  const markAttendance = useMarkAttendance();

  const slotStudents = useMemo(
    () => (myStudents ?? []).filter(s => s.groups.some(g => g.id === firstSlot?.groupId)),
    [myStudents, firstSlot],
  );

  const recordMap = useMemo(() => {
    const m = new Map<string, "p" | "a" | "l" | "ae">();
    for (const r of records ?? []) m.set(r.studentId, r.status);
    return m;
  }, [records]);

  function setStatus(studentId: string, status: "p" | "a" | "l" | "ae") {
    if (!firstSlot) return;
    const next = slotStudents.map(s => ({
      studentId: s.id,
      status: s.id === studentId ? status : (recordMap.get(s.id) ?? "p"),
    }));
    markAttendance.mutate({ scheduleSlotId: firstSlot.id, date, records: next });
  }

  const countdown = useCountdown(nextLesson?.startTime);

  const liveLessonEndTime = useMemo(() => {
    if (!liveLesson) return undefined;
    const [h, m] = liveLesson.startTime.split(":").map(Number);
    const total = h * 60 + m + (liveLesson.durationMinutes ?? 90);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [liveLesson]);
  const liveCountdown = useCountdown(liveLessonEndTime);

  /* hero data */
  const firstName        = profile?.fullName?.split(" ")[0] ?? "Ustoz";
  const initials         = (profile?.fullName ?? "AK").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const totalStudents    = profile?.studentsCount ?? myStudents?.length ?? 0;
  const todayLessonsCount = todaySchedule?.length ?? 0;

  const today    = new Date();
  const MONTHS_S = ["Yan","Fev","Mar","Apr","May","Iyu","Iyu","Avg","Sen","Okt","Noy","Dek"];
  const MONTHS_FULL = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  const DAYS_S   = ["Yak","Du","Se","Ch","Pa","Ju","Sha"];
  const dayShort = `${MONTHS_S[today.getMonth()]} ${today.getDate()}, ${DAYS_S[today.getDay()]}`;
  const longDate = `${today.getDate()} ${MONTHS_FULL[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* ── Hero ── */}
      <div style={{
        borderRadius: 20, padding: "28px 32px",
        background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)",
        color: "#fff", position: "relative", overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position:"absolute", right:-50, top:-70, width:240, height:240, borderRadius:"50%", background:"rgba(255,255,255,0.08)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", right:100, bottom:-90, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }}/>

        {/* admin panel button */}
        <button
          onClick={() => navigate("/admin")}
          style={{
            position:"absolute", top:22, right:24,
            background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)",
            borderRadius:10, padding:"7px 16px", color:"#fff", fontSize:13, fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center", gap:7,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Admin panel
        </button>

        {/* profile row */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:22 }}>
          <div style={{
            width:52, height:52, borderRadius:16, flexShrink:0,
            background:"rgba(255,255,255,0.22)", border:"2px solid rgba(255,255,255,0.45)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:800,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em" }}>
              Assalomu alaykum, {firstName}! 👋
            </div>
            <div style={{ fontSize:14, opacity:0.85, marginTop:4 }}>
              Bugun {dayShort} — {todayLessonsCount} ta darsing bor
            </div>
          </div>
        </div>

        {/* stats row */}
        <div style={{ display:"flex", gap:0 }}>
          {[
            { v: String(totalStudents),                                          l: "O'quvchilar" },
            { v: String(profile?.groupsCount ?? 0),                             l: "Guruhlar"    },
            { v: "4.9 ⭐",                                                        l: "Reyting"     },
            { v: profile?.expYears ? `${profile.expYears} yil` : "8 yil",       l: "Tajriba"     },
          ].map((s, i) => (
            <Fragment key={s.l}>
              {i > 0 && <div style={{ width:1, background:"rgba(255,255,255,0.3)", margin:"0 24px" }}/>}
              <div>
                <div style={{ fontSize:22, fontWeight:800 }}>{s.v}</div>
                <div style={{ fontSize:12.5, opacity:0.8, marginTop:2 }}>{s.l}</div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── Next lesson countdown ── */}
      {noLessonToday && (
        <div style={{
          borderRadius:18, padding:"22px 28px",
          background:"var(--surface-2)", border:"1px solid var(--border)",
          display:"flex", alignItems:"center", gap:14,
        }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"var(--surface-3)", display:"grid", placeItems:"center", flexShrink:0, fontSize:20 }}>
            📅
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>Bugun dars yo'q</div>
            <div style={{ fontSize:13, color:"var(--text-faint)", marginTop:2 }}>Guruhlaringiz uchun bugunga rejalashtirilgan dars mavjud emas</div>
          </div>
        </div>
      )}
      {upcomingLesson && !liveLesson && (
        <div style={{
          borderRadius:18, padding:"22px 28px",
          background:"linear-gradient(135deg, #1e3a8a 0%, #1e40af 55%, #2563eb 100%)",
          color:"#fff", display:"flex", alignItems:"center", gap:24,
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.09em", opacity:0.65, marginBottom:8, textTransform:"uppercase" }}>
              Keyingi dars
            </div>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
              {upcomingLesson.groupName ?? upcomingLesson.customName ?? "Dars"}
              {upcomingLesson.isRescheduled && (
                <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(34,197,94,.35)", border:"1px solid rgba(34,197,94,.6)", padding:"2px 9px", borderRadius:20 }}>
                  → Ko'chirilgan
                </span>
              )}
              {upcomingLesson.lessonType === "diagnostika" && (
                <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(245,158,11,.35)", border:"1px solid rgba(245,158,11,.6)", padding:"2px 9px", borderRadius:20 }}>
                  Diagnostika
                </span>
              )}
              {upcomingLesson.lessonType === "individual" && (
                <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(124,58,237,.35)", border:"1px solid rgba(124,58,237,.6)", padding:"2px 9px", borderRadius:20 }}>
                  Individual
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:22, fontSize:13.5, opacity:0.85 }}>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {upcomingLesson.startTime.slice(0, 5)}
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {studentsMap[upcomingLesson.groupName ?? ""] ?? slotStudents.length} o'quvchi
              </span>
            </div>
          </div>

          {/* countdown boxes */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            {[
              { v: countdown.h, l: "SOAT"    },
              { v: countdown.m, l: "DAQIQA"  },
              { v: countdown.s, l: "SONIYA"  },
            ].map((t, i) => (
              <Fragment key={t.l}>
                {i > 0 && <div style={{ fontSize:22, fontWeight:800, opacity:0.5, paddingBottom:14 }}>:</div>}
                <div style={{
                  background:"rgba(255,255,255,0.14)", borderRadius:12,
                  border:"1px solid rgba(255,255,255,0.2)",
                  padding:"10px 14px", textAlign:"center", minWidth:66,
                }}>
                  <div style={{ fontSize:28, fontWeight:900, lineHeight:1 }}>{t.v}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, opacity:0.65, marginTop:5, letterSpacing:"0.05em" }}>{t.l}</div>
                </div>
              </Fragment>
            ))}
            <div style={{ fontSize:14, fontWeight:700, opacity:0.8, marginLeft:4 }}>qoldi</div>
          </div>
        </div>
      )}

      {liveLesson && (() => {
        return (
          <div style={{
            borderRadius:18, padding:"22px 28px",
            background:"linear-gradient(135deg, #059669 0%, #047857 55%, #065f46 100%)",
            color:"#fff", display:"flex", alignItems:"center", gap:24, flexWrap:"wrap",
          }}>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:"#fff", display:"inline-block" }} />
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.09em", opacity:0.85, textTransform:"uppercase" }}>
                  Hozir davom etmoqda
                </span>
              </div>
              <div style={{ fontSize:20, fontWeight:800, marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
                {liveLesson.groupName ?? liveLesson.customName ?? "Dars"}
                {liveLesson.isRescheduled && (
                  <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(255,255,255,.25)", border:"1px solid rgba(255,255,255,.5)", padding:"2px 9px", borderRadius:20 }}>
                    → Ko'chirilgan
                  </span>
                )}
                {liveLesson.lessonType === "diagnostika" && (
                  <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(245,158,11,.35)", border:"1px solid rgba(245,158,11,.6)", padding:"2px 9px", borderRadius:20 }}>
                    Diagnostika
                  </span>
                )}
                {liveLesson.lessonType === "individual" && (
                  <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(124,58,237,.35)", border:"1px solid rgba(124,58,237,.6)", padding:"2px 9px", borderRadius:20 }}>
                    Individual
                  </span>
                )}
              </div>
              <div style={{ fontSize:13.5, opacity:0.85 }}>
                {liveLesson.startTime.slice(0,5)} · {studentsMap[liveLesson.groupName ?? ""] ?? slotStudents.length} o'quvchi
                {" · "}⏱ tugashiga {liveCountdown.m}:{liveCountdown.s}
              </div>
            </div>

            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {!liveLesson.isStarted ? (
                <button className="btn primary" style={{ background:"#fff", color:"#065f46" }}
                  disabled={joinTeacherLesson.isPending}
                  onClick={() => {
                    joinTeacherLesson.mutate(liveLesson.id);
                    navigate(`/teacher/live-lesson/${liveLesson.id}`);
                  }}>
                  ▶ Darsni boshlash
                </button>
              ) : (
                <button className="btn primary" style={{ background:"#fff", color:"#065f46" }}
                  onClick={() => navigate(`/teacher/live-lesson/${liveLesson.id}`)}>
                  → Dars jurnaliga o'tish
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 4 KPI cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"var(--gap)" }}>
        {[
          {
            bg:"#dbeafe", color:"#2563eb",
            value: String(todayLessonsCount),
            label: "Bugungi darslar",
            svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>,
          },
          {
            bg:"#dbeafe", color:"#2563eb",
            value: String(totalStudents),
            label: "Jami o'quvchilar",
            svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>,
          },
          {
            bg:"#d1fae5", color:"#059669",
            value: "87%",
            label: "Davomat o'rtacha",
            svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>,
          },
          {
            bg:"#fef3c7", color:"#d97706",
            value: `${fmtSom(income?.totalAmount ?? 0)} so'm`,
            label: "Bu oy daromad",
            svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>,
          },
        ].map(card => (
          <Card key={card.label} style={{ padding:"22px 24px" }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:card.bg, color:card.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              marginBottom:16,
            }}>
              {card.svg}
            </div>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-0.03em", marginBottom:4 }}>{card.value}</div>
            <div style={{ fontSize:13, color:"var(--text-faint)", fontWeight:600 }}>{card.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Bottom 2 columns ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--gap)" }}>

        {/* Today's schedule */}
        <Card style={{ padding:0 }}>
          <div style={{
            padding:"18px 22px 14px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            borderBottom:"1px solid var(--border)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:36, height:36, borderRadius:10,
                background:"#dbeafe", color:"#2563eb",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  <polyline points="9 16 11 18 15 14"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>Bugungi darslar</div>
                <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:1 }}>{longDate}</div>
              </div>
            </div>
            <button
              className="btn"
              style={{ fontSize:12.5, padding:"6px 14px" }}
              onClick={() => navigate("/teacher/schedule")}
            >
              Jadval →
            </button>
          </div>

          <div style={{ padding:"6px 0" }}>
            {todaySchedule && todaySchedule.length > 0 ? todaySchedule.map(s => {
              const [h, mi] = s.startTime.split(":").map(Number);
              const lessonMins = h * 60 + mi;
              const isActive = lessonMins <= nm && nm < lessonMins + (s.durationMinutes ?? 90);
              const cnt = studentsMap[s.groupName ?? ""] ?? slotStudents.length;
              return (
                <div key={s.id} style={{
                  padding:"14px 22px",
                  borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                  background: isActive ? "var(--accent)0a" : "transparent",
                }}>
                  <div style={{ fontSize:12, color:"var(--text-faint)", marginBottom:4, fontWeight:600 }}>
                    {s.startTime.slice(0, 5)}
                  </div>
                  <div style={{ fontWeight:750, fontSize:14.5, marginBottom:6, display:"flex", alignItems:"center", gap:8 }}>
                    {s.groupName ?? s.customName ?? "Dars"}
                    {s.isRescheduled && (
                      <span style={{ fontSize:10.5, fontWeight:700, color:"#059669", background:"#d1fae5", padding:"2px 7px", borderRadius:20 }}>
                        → Ko'chirilgan
                      </span>
                    )}
                    {s.lessonType === "diagnostika" && (
                      <span style={{ fontSize:10.5, fontWeight:700, color:"#f59e0b", background:"#fef3c7", padding:"2px 7px", borderRadius:20 }}>
                        Diagnostika
                      </span>
                    )}
                    {s.lessonType === "individual" && (
                      <span style={{ fontSize:10.5, fontWeight:700, color:"#7c3aed", background:"#ede9fe", padding:"2px 7px", borderRadius:20 }}>
                        Individual
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12.5, color:"var(--text-faint)", display:"flex", alignItems:"center", gap:4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      </svg>
                      {cnt} o'quvchi
                    </span>
                    {isActive && (
                      <span style={{ fontSize:12, fontWeight:700, color:"#059669", display:"flex", alignItems:"center", gap:4 }}>
                        ♟ Hozir davom etmoqda
                      </span>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding:"36px 22px", textAlign:"center", color:"var(--text-faint)", fontSize:13 }}>
                Bugun darslar yo'q
              </div>
            )}
          </div>
        </Card>

        {/* Quick attendance */}
        <Card style={{ padding:0 }}>
          <div style={{
            padding:"18px 22px 14px",
            display:"flex", alignItems:"center", gap:12,
            borderBottom:"1px solid var(--border)",
          }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"#dbeafe", color:"#2563eb",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15 }}>Tezkor davomat</div>
              <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:1 }}>
                {firstSlot?.groupName ?? "—"}
              </div>
            </div>
          </div>

          <div style={{ padding:"6px 0" }}>
            {slotStudents.length > 0 ? slotStudents.map(s => {
              const status = recordMap.get(s.id);
              return (
                <div key={s.id} style={{
                  display:"flex", alignItems:"center", gap:12, padding:"10px 22px",
                }}>
                  <Avatar name={s.fullName} size="sm" />
                  <div style={{ flex:1, fontSize:13.5, fontWeight:650 }}>{s.fullName}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {(["p","l","a"] as const).map(k => (
                      <button
                        key={k}
                        onClick={() => setStatus(s.id, k)}
                        style={{
                          width:30, height:30, borderRadius:8, border:"none",
                          cursor:"pointer", fontSize:13, fontWeight:700,
                          background: status === k
                            ? k === "p" ? "#d1fae5" : k === "l" ? "#fef3c7" : "#fee2e2"
                            : "var(--surface-2)",
                          color: status === k
                            ? k === "p" ? "#059669" : k === "l" ? "#d97706" : "#dc2626"
                            : "var(--text-faint)",
                          transition:"background .15s",
                        }}
                      >
                        {{ p:"✓", l:"–", a:"✗" }[k]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding:"36px 22px", textAlign:"center", color:"var(--text-faint)", fontSize:13 }}>
                {firstSlot ? "O'quvchilar topilmadi" : "Bugun darslar yo'q"}
              </div>
            )}
          </div>
        </Card>

      </div>
      {/* ── O'quvchilar natijasi ── */}
      <Card style={{ padding:0 }}>
        <div style={{
          padding:"18px 24px 14px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:"1px solid var(--border)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"#dbeafe", color:"#2563eb",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15 }}>O'quvchilar natijasi</div>
              <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:1 }}>Top 6 ta o'quvchi</div>
            </div>
          </div>
          <button className="btn" style={{ fontSize:13, padding:"6px 16px" }} onClick={() => navigate("/teacher/progress")}>
            Batafsil
          </button>
        </div>

        <div style={{ padding:"8px 0" }}>
          {(progressData ?? []).length === 0 ? (
            <div style={{ padding:"36px 22px", textAlign:"center", color:"var(--text-faint)", fontSize:13 }}>
              O'quvchilar topilmadi
            </div>
          ) : (progressData ?? []).slice(0, 6).map((s) => (
            <div key={s.id} style={{
              display:"flex", alignItems:"center", gap:14, padding:"14px 24px",
            }}>
              <Avatar name={s.fullName} size="sm" />
              <div style={{ width:200, flexShrink:0 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{s.fullName}</div>
                <div style={{ fontSize:12, color:"var(--text-faint)", marginTop:2 }}>
                  {s.level ?? "—"} daraja
                </div>
              </div>
              <div style={{ flex:1, height:8, borderRadius:99, background:"var(--surface-2)", overflow:"hidden" }}>
                <div style={{
                  height:"100%", borderRadius:99,
                  width:`${s.attendanceRate}%`,
                  background:"#3b82f6",
                  transition:"width .4s ease",
                }}/>
              </div>
              <div style={{
                width:44, textAlign:"right", flexShrink:0,
                fontSize:14, fontWeight:800,
                color: s.attendanceRate >= 85 ? "#16a34a" : "#d97706",
              }}>
                {s.attendanceRate}%
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
