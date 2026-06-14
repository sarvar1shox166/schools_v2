import { useMemo, useState } from "react";
import { Avatar, Card, Icon, PageHead, StatusBadge } from "@chess-school/ui";
import { useMyStudents, useStudentPackages } from "../../lib/queries.js";

function RatingStars({ xp }: { xp: number }) {
  const rating = 4 + (xp % 100) / 100;
  const full = Math.round(rating);
  return (
    <div className="stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" size={14} className={i < full ? "" : "empty"} />
      ))}
      <span className="cell-sub" style={{ marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </div>
  );
}

function PaymentBadge({ studentId }: { studentId: string }) {
  const { data: packages, isLoading } = useStudentPackages(studentId);
  if (isLoading) return <span className="cell-sub">...</span>;
  const active = packages?.find((p) => p.status === "active");
  if (!active) return <StatusBadge status="qarzdor" />;
  const remaining = active.totalLessons - active.usedLessons;
  if (remaining <= 0) return <StatusBadge status="qarzdor" />;
  return <StatusBadge status="to'langan" />;
}

export default function TStudentsPage() {
  const { data: students, isLoading } = useMyStudents();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students?.filter((s) => s.fullName.toLowerCase().includes(q));
  }, [students, search]);

  return (
    <div>
      <PageHead title="O'quvchilarim">
        <input
          className="inp"
          style={{ maxWidth: 240 }}
          placeholder="Qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </PageHead>
      <Card className="fade-up">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>O'quvchi</th>
                <th>Guruhlar</th>
                <th>Daraja</th>
                <th>Holat</th>
                <th>XP</th>
                <th>So'nggi dars</th>
                <th>Reyting</th>
                <th>To'lov</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={s.fullName} size="sm" />
                      <div>
                        <div className="cell-main">{s.fullName}</div>
                        <div className="cell-sub">{s.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.groups.map((g) => g.name).join(", ")}</td>
                  <td>{s.level ?? "—"}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="tnum">{s.xp} (L{s.xpLevel})</td>
                  <td>{s.lastLessonDate ? new Date(s.lastLessonDate).toLocaleDateString("uz-UZ") : "—"}</td>
                  <td><RatingStars xp={s.xp} /></td>
                  <td><PaymentBadge studentId={s.id} /></td>
                </tr>
              ))}
              {!isLoading && (filtered?.length ?? 0) === 0 && (
                <tr><td colSpan={8}><div className="empty"><Icon name="students" size={28} /><div>O'quvchilar topilmadi</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
