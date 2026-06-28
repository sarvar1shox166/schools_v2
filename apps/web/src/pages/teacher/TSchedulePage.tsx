import { useTeacherSchedule } from "../../lib/queries.js";

const DAY_NAMES = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
const DAY_SHORT = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];

export default function TSchedulePage() {
  const { data, isLoading } = useTeacherSchedule();
  const slots = data?.slots ?? [];
  const groups = data?.groups ?? [];

  const totalStudents = groups.reduce((s, g) => s + g.studentsCount, 0);
  const weeklyHours = groups.reduce((s, g) => s + g.weeklyHours, 0);

  const kpis = [
    { v: String(slots.length),          l: "Dars (hafta)" },
    { v: `${weeklyHours.toFixed(1)} s`, l: "Umumiy soat" },
    { v: String(groups.length),         l: "Guruh" },
    { v: String(totalStudents),         l: "O'quvchilar" },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap)" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Dars jadvali</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "var(--gap)", alignItems: "start" }}>
        {/* Slots list */}
        <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Haftalik jadval</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>Jami {slots.length} ta dars joylashgan</div>
            </div>
          </div>

          {slots.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-faint)" }}>
              Jadval topilmadi
            </div>
          ) : (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...slots]
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek || String(a.startTime).localeCompare(String(b.startTime)))
                .map((slot) => {
                  const color = slot.color ?? "#3b82f6";
                  return (
                    <div key={slot.id} style={{
                      background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px",
                      borderLeft: `3px solid ${color}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 3 }}>
                          {DAY_NAMES[slot.dayOfWeek]} · {String(slot.startTime).slice(0, 5)}
                          {slot.isOnline ? " · Online" : ""}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{slot.groupName}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                          {slot.studentsCount} o'q
                        </span>
                        {slot.isOnline && slot.meetingUrl && (
                          <a href={slot.meetingUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", textDecoration: "none",
                              background: "#dbeafe", padding: "3px 9px", borderRadius: 20 }}>
                            Zoom
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {/* KPI cards */}
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Haftalik yuklanma</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {kpis.map((k) => (
                <div key={k.l} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{k.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Groups */}
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Mening guruhlarim</span>
            </div>
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
                Guruh topilmadi
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {groups.map((g, i) => {
                  const color = g.color ?? "#3b82f6";
                  const groupSlots = slots.filter((s) => s.groupId === g.id);
                  const days = [...new Set(groupSlots.map((s) => s.dayOfWeek))].sort().map((d) => DAY_SHORT[d]).join("·");
                  const time = groupSlots[0] ? String(groupSlots[0].startTime).slice(0, 5) : "";
                  const letter = (g.name[0] ?? "G").toUpperCase();

                  return (
                    <div key={g.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                      borderBottom: i < groups.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 15, flexShrink: 0,
                      }}>
                        {letter}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                          {days}{time ? ` · ${time}` : ""}
                        </div>
                      </div>
                      <span style={{ background: "var(--surface-2)", color: "var(--text-faint)", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>
                        {g.studentsCount} ta
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
