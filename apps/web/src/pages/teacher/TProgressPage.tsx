import { useMemo, useState } from "react";
import { Avatar, Card, Icon, PageHead, Segmented, StatCard } from "@chess-school/ui";
import { useMyStudentsProgress } from "../../lib/queries.js";

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

export default function TProgressPage() {
  const [sort, setSort] = useState<"xp" | "attendance" | "name">("xp");
  const { data: students, isLoading } = useMyStudentsProgress(sort);

  const bands = useMemo(() => {
    const result = { excellent: 0, good: 0, average: 0, weak: 0 };
    for (const s of students ?? []) {
      if (s.attendanceRate >= 90) result.excellent++;
      else if (s.attendanceRate >= 75) result.good++;
      else if (s.attendanceRate >= 50) result.average++;
      else result.weak++;
    }
    return result;
  }, [students]);

  return (
    <div>
      <PageHead title="O'quvchi natijasi">
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { v: "xp", label: "XP" },
            { v: "attendance", label: "Davomat" },
            { v: "name", label: "Ism" },
          ]}
        />
      </PageHead>

      <div className="kpi-grid" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="award" tone="a" value={String(bands.excellent)} label="A'lo 90%+" />
        <StatCard icon="check" tone="s" value={String(bands.good)} label="Yaxshi" />
        <StatCard icon="target" tone="i" value={String(bands.average)} label="O'rta" />
        <StatCard icon="alert" tone="d" value={String(bands.weak)} label="Zaif" />
      </div>

      <Card className="fade-up">
        <div className="card-pad" style={{ paddingTop: 8 }}>
          {students?.map((s) => (
            <div className="sp-row" key={s.id}>
              <Avatar name={s.fullName} />
              <div className="sp-name">
                <div className="nm">{s.fullName}</div>
                <div className="sub">{s.level ?? "—"} · {s.xp} XP · Lvl {s.level2} · {s.streak} kun streak</div>
              </div>
              <RatingStars xp={s.xp} />
              <div className="sp-bar"><div className="pbar"><span style={{ width: `${s.attendanceRate}%` }} /></div></div>
              <div
                className="sp-pct"
                style={{ color: s.attendanceRate >= 80 ? "var(--success)" : s.attendanceRate >= 60 ? "var(--warn)" : "var(--danger)" }}
              >
                {s.attendanceRate}%
              </div>
            </div>
          ))}
          {!isLoading && (students?.length ?? 0) === 0 && (
            <div className="empty"><Icon name="target" size={28} /><div>Ma'lumot yo'q</div></div>
          )}
        </div>
      </Card>
    </div>
  );
}
