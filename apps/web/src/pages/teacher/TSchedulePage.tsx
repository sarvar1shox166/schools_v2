import { useState } from "react";
import { Card, Icon, PageHead, Segmented } from "@chess-school/ui";
import { useMyTeacherSchedule } from "../../lib/queries.js";

const DAY_NAMES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

export default function TSchedulePage() {
  const [period, setPeriod] = useState<"kun" | "hafta" | "oy">("hafta");
  const { data } = useMyTeacherSchedule();

  const slots = data?.slots ?? [];
  const groups = data?.groups ?? [];

  const totalLessons = slots.length;
  const totalHours = groups.reduce((sum, g) => sum + g.weeklyHours, 0);
  const totalGroups = groups.length;
  const totalStudents = groups.reduce((sum, g) => sum + g.studentsCount, 0);

  const kpis = [
    { v: String(totalLessons), l: "Dars" },
    { v: `${totalHours} soat`, l: "Umumiy" },
    { v: String(totalGroups), l: "Guruh" },
    { v: String(totalStudents), l: "O'quvchi" },
  ];

  return (
    <div>
      <PageHead title="Dars jadvali">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { v: "kun", label: "Kun" },
            { v: "hafta", label: "Hafta" },
            { v: "oy", label: "Oy" },
          ]}
        />
      </PageHead>

      <div className="grid l-2-1" style={{ marginTop: "var(--gap)" }}>
        <Card className="fade-up">
          <div className="card-head">
            <div className="head-ic"><Icon name="clock" size={18} /></div>
            <div>
              <div className="ttl">Bu hafta</div>
              <div className="sub">Jami {totalLessons} ta dars</div>
            </div>
          </div>
          <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {period !== "hafta" ? (
              <div className="cell-sub" style={{ padding: "20px 0", textAlign: "center" }}>
                Bu rejim hozircha ishlamaydi. "Hafta" tabini tanlang.
              </div>
            ) : slots.length === 0 ? (
              <div className="cell-sub" style={{ padding: "20px 0", textAlign: "center" }}>
                Dars jadvali topilmadi.
              </div>
            ) : (
              slots.map((s) => (
                <div className="lesson-card" key={s.id}>
                  <div className="lc-time">
                    {DAY_NAMES[s.dayOfWeek]} · {s.startTime.slice(0, 5)}
                  </div>
                  <div className="lc-name">{s.groupName}</div>
                  <div className="lc-meta">
                    {s.roomName && (
                      <span><Icon name="pin" size={13} /> {s.roomName}</span>
                    )}
                    <span><Icon name="students" size={13} /> {s.studentsCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="target" size={17} style={{ color: "var(--accent-text)" }} /> Haftalik yuklanma
            </div>
            <div className="kpi-grid">
              {kpis.map((k) => (
                <div className="kpi" key={k.l}>
                  <div className="v">{k.v}</div>
                  <div className="l">{k.l}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="groups" size={17} style={{ color: "var(--accent-text)" }} /> Mening guruhlarim
            </div>
            {groups.length === 0 ? (
              <div className="cell-sub">Guruhlar topilmadi.</div>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: g.color ?? "var(--accent)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {g.name.slice(0, 1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 14 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                      {g.slotsCount} dars/hafta · {g.weeklyHours} soat
                    </div>
                  </div>
                  <span className="badge neut">{g.studentsCount} ta</span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
