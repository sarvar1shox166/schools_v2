import { Fragment, useMemo, useState } from "react";
import { Avatar, Card, fmtSom, Icon, PageHead, StatCard } from "@chess-school/ui";
import {
  useAttendance,
  useMarkAttendance,
  useMyIncome,
  useMyLessons,
  useMyProfile,
  useMyStudents,
  useMyStudentsProgress,
  useTodaySchedule,
} from "../../lib/queries.js";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeacherDashboard() {
  const { data: lessons } = useMyLessons();
  const { data: income } = useMyIncome(currentPeriod());
  const { data: todaySchedule } = useTodaySchedule();
  const { data: myStudents } = useMyStudents();
  const { data: profile } = useMyProfile();
  const { data: studentsProgress } = useMyStudentsProgress();

  const todayLessons = lessons?.filter((l) => l.date.slice(0, 10) === todayStr()) ?? [];
  const studentsTotal = todayLessons.reduce((sum, l) => sum + l.studentsCount, 0);

  const firstSlot = todaySchedule?.[0];
  const date = todayStr();
  const { data: records } = useAttendance(firstSlot?.id ?? null, date);
  const markAttendance = useMarkAttendance();

  const slotStudents = useMemo(
    () => (myStudents ?? []).filter((s) => s.groups.some((g) => g.id === firstSlot?.groupId)),
    [myStudents, firstSlot]
  );

  const recordMap = useMemo(() => {
    const m = new Map<string, "p" | "a" | "l">();
    for (const r of records ?? []) m.set(r.studentId, r.status);
    return m;
  }, [records]);

  function setStatus(studentId: string, status: "p" | "a" | "l") {
    if (!firstSlot) return;
    const next = slotStudents.map((s) => ({
      studentId: s.id,
      status: s.id === studentId ? status : recordMap.get(s.id) ?? "p",
    }));
    markAttendance.mutate({ scheduleSlotId: firstSlot.id, date, records: next });
  }

  const firstName = profile?.fullName?.split(" ")[0] ?? "";
  const heroStats = [
    { v: String(profile?.studentsCount ?? 0), l: "O'quvchilar" },
    { v: String(profile?.groupsCount ?? 0), l: "Guruhlar" },
    { v: "4.9 ⭐", l: "Reyting" },
    { v: profile?.expYears ? `${profile.expYears} yil` : "—", l: "Tajriba" },
  ];

  const topStudents = (studentsProgress ?? []).slice(0, 6);

  return (
    <div>
      <PageHead title="O'qituvchi Dashboard" />

      {profile && (
        <div className="t-hero fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <Avatar name={profile.fullName} size="lg" />
            <div>
              <h2>Salom, {firstName}! 👋</h2>
              <p>
                Bugun{" "}
                {new Date().toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" })} —{" "}
                {todayLessons.length} ta darsing bor
              </p>
            </div>
          </div>
          <div className="hero-stats">
            {heroStats.map((s, i) => (
              <Fragment key={s.l}>
                {i > 0 && <div className="hero-sep" />}
                <div className="hero-stat">
                  <div className="v">{s.v}</div>
                  <div className="l">{s.l}</div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <StatCard icon="calendarCheck" tone="a" value={String(todayLessons.length)} label="Bugungi darslar" />
        <StatCard icon="students" tone="i" value={String(studentsTotal)} label="Bugun o'quvchilar" />
        <StatCard icon="wallet" tone="s" value={`${fmtSom(income?.totalAmount ?? 0)} so'm`} label="Bu oy daromad" />
      </div>

      {firstSlot && slotStudents.length > 0 && (
        <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
          <div className="card-head"><div className="ttl">Tezkor davomat — {firstSlot.groupName}</div></div>
          <div className="card-pad" style={{ paddingTop: 8 }}>
            {slotStudents.map((s) => {
              const status = recordMap.get(s.id);
              return (
                <div className="att-row" key={s.id}>
                  <Avatar name={s.fullName} size="sm" />
                  <div style={{ flex: 1, fontSize: 13.5, fontWeight: 650 }}>{s.fullName}</div>
                  <div className="att-btns">
                    {(["p", "l", "a"] as const).map((k) => (
                      <button
                        key={k}
                        className={"att-btn " + k + (status === k ? " sel" : "")}
                        onClick={() => setStatus(s.id, k)}
                        title={{ p: "Keldi", l: "Kechikdi", a: "Kelmadi" }[k]}
                      >
                        {{ p: "✓", l: "~", a: "✗" }[k]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {todaySchedule && todaySchedule.length > 0 && (
        <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
          <div className="card-head"><div className="ttl">Bugungi darslar jadvali</div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
            {todaySchedule.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div className="cell-main">{s.startTime.slice(0, 5)} · {s.groupName}</div>
                  <div className="cell-sub">{s.roomName ?? ""}</div>
                </div>
                {s.isOnline && s.meetingUrl && (
                  <a className="btn sm primary" href={s.meetingUrl} target="_blank" rel="noreferrer">
                    <Icon name="zap" size={14} /> Qo'shilish
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {topStudents.length > 0 && (
        <Card className="fade-up" style={{ marginTop: "var(--gap)" }}>
          <div className="card-head">
            <div className="head-ic"><Icon name="trendingUp" size={18} /></div>
            <div style={{ flex: 1 }}>
              <div className="ttl">O'quvchilar natijasi</div>
              <div className="sub">Top 6 ta o'quvchi</div>
            </div>
          </div>
          <div className="card-pad" style={{ paddingTop: 8 }}>
            {topStudents.map((s) => {
              const progress = Math.min(100, s.xp % 100 || (s.xp > 0 ? 100 : 0));
              return (
                <div className="sp-row" key={s.id}>
                  <Avatar name={s.fullName} size="sm" round />
                  <div className="sp-name">
                    <div className="nm">{s.fullName}</div>
                    <div className="sub">{s.level ?? "—"} · {s.xp} XP</div>
                  </div>
                  <div className="sp-bar">
                    <div className="pbar"><span style={{ width: `${progress}%` }} /></div>
                  </div>
                  <div
                    className="sp-pct"
                    style={{ color: progress >= 80 ? "var(--success)" : progress >= 60 ? "var(--warn)" : "var(--danger)" }}
                  >
                    {progress}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
