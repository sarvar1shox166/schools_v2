import { useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import { useMyStudentsProgress, type MyStudentProgress } from "../../lib/queries.js";

const AVATAR_COLORS = ["#2563eb","#d97706","#059669","#7c3aed","#db2777","#0891b2","#65a30d","#ea580c"];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function XPBar({ xp }: { xp: number }) {
  const maxXp = 2000;
  const pct = Math.min((xp / maxXp) * 100, 100);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>XP</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706" }}>⚡{xp}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: 99, transition: "width .3s" }} />
      </div>
    </div>
  );
}

function DavomatBadge({ pct }: { pct: number }) {
  const color = pct >= 85 ? "#059669" : pct >= 65 ? "#d97706" : "#dc2626";
  const bg = pct >= 85 ? "#d1fae5" : pct >= 65 ? "#fef3c7" : "#fee2e2";
  return (
    <span style={{ background: bg, color, borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      {pct}%
    </span>
  );
}

function StudentRow({ student, idx }: { student: MyStudentProgress; idx: number }) {
  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = getInitials(student.fullName);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 20px", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", background: avatarColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 14 }}>{student.fullName}</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>
          {student.level ?? "—"} · Daraja {student.level2}
          {student.streak > 0 && ` · 🔥 ${student.streak} kun`}
        </div>
      </div>

      <XPBar xp={student.xp} />

      <div style={{ flexShrink: 0, marginLeft: 12 }}>
        <DavomatBadge pct={student.attendanceRate} />
      </div>
    </div>
  );
}

type SortKey = "xp" | "davomat" | "ism";

const SORT_TABS: { key: SortKey; label: string; apiKey: "xp" | "attendance" | "name" }[] = [
  { key: "xp",      label: "XP",      apiKey: "xp" },
  { key: "davomat", label: "Davomat", apiKey: "attendance" },
  { key: "ism",     label: "Ism",     apiKey: "name" },
];

export default function TProgressPage() {
  const [activeSort, setActiveSort] = useState<SortKey>("xp");
  const currentTab = SORT_TABS.find((t) => t.key === activeSort)!;
  const { data: students = [], isLoading } = useMyStudentsProgress(currentTab.apiKey);

  const totalXP = students.reduce((s, st) => s + st.xp, 0);
  const avgAttendance = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.attendanceRate, 0) / students.length)
    : 0;
  const activeCount = students.filter((st) => st.xp > 0).length;

  return (
    <div style={{ padding: "24px 24px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>O'quvchi natijalari</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {SORT_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveSort(tab.key)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 13, transition: "background 0.15s, color 0.15s",
              background: activeSort === tab.key ? "#2563eb" : "var(--surface-2)",
              color: activeSort === tab.key ? "#fff" : "var(--text-faint)",
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "users", label: "Jami o'quvchilar", value: students.length, tone: "#2563eb", bg: "#dbeafe" },
          { icon: "zap",   label: "Jami XP",           value: totalXP,         tone: "#d97706", bg: "#fef3c7" },
          { icon: "check", label: "Faol o'quvchilar",  value: activeCount,     tone: "#059669", bg: "#d1fae5" },
          { icon: "calendar",label: "O'rt. davomat",   value: `${avgAttendance}%`, tone: "#7c3aed", bg: "#ede9fe" },
        ].map((c) => (
          <Card key={c.label}>
            <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={c.icon as any} size={20} style={{ color: c.tone }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>{c.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="trending-up" size={16} style={{ color: "#2563eb" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>O'quvchilar reytingi</span>
          <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: "auto" }}>
            {students.length} ta o'quvchi
          </span>
        </div>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 20px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 38 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            O'quvchi
          </div>
          <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            XP ko'rsatgich
          </div>
          <div style={{ width: 70, fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
            Davomat
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-faint)" }}>
            O'quvchilar topilmadi
          </div>
        ) : (
          students.map((s, idx) => <StudentRow key={s.id} student={s} idx={idx} />)
        )}
      </Card>
    </div>
  );
}
