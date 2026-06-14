import { useEffect, useState } from "react";
import { Avatar, Card, Icon, PageHead, showXp } from "@chess-school/ui";
import {
  useAttendanceHistory,
  useCompleteHomework,
  useHomework,
  useMaterials,
  useNextLesson,
  useRecordings,
  useSchedule,
} from "../../lib/queries.js";

const DAY_LABELS = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Shan"];
const STATUS_COLOR: Record<string, string> = { p: "var(--success)", l: "var(--warn)", a: "var(--danger)" };
const STATUS_LABEL: Record<string, string> = { p: "Keldi", l: "Kechikdi", a: "Kelmadi" };
const STATUS_MARK: Record<string, string> = { p: "✓", l: "~", a: "✗" };

function fmtCountdown(nextAt: string) {
  const diff = new Date(nextAt).getTime() - Date.now();
  if (diff <= 0) return "Hozir";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days} kun ${hours} soat`;
  if (hours > 0) return `${hours} soat ${mins} daqiqa`;
  return `${mins} daqiqa`;
}

function fmtCountdownPrecise(nextAt: string) {
  const diff = Math.max(0, new Date(nextAt).getTime() - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LessonsPage() {
  const { data: next } = useNextLesson();
  const { data: schedule } = useSchedule();
  const { data: recordings } = useRecordings();
  const { data: attendance } = useAttendanceHistory();
  const { data: homework } = useHomework();
  const { data: materials } = useMaterials();
  const completeHomework = useCompleteHomework();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleComplete(id: string, xpReward: number) {
    const res = await completeHomework.mutateAsync(id);
    if (!res.alreadyCompleted) {
      showXp(res.xpAwarded ?? xpReward, "Uy vazifasi bajarildi!");
    }
  }

  return (
    <div>
      <PageHead title="Darslarim" />

      {next && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--gap)", alignItems: "stretch", marginBottom: "var(--gap)" }}>
          <div className="t-hero fade-up">
            <h2>{next.groupName}</h2>
            <p>
              {DAY_LABELS[next.dayOfWeek]} · {next.startTime} {next.teacherName ? `· ${next.teacherName}` : ""}
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="v" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCountdownPrecise(next.nextAt)}</div>
                <div className="l">Keyingi darsgacha ({fmtCountdown(next.nextAt)})</div>
              </div>
              {next.isOnline && next.meetingUrl && (
                <>
                  <div className="hero-sep" />
                  <div className="hero-stat">
                    <a
                      href={next.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#fff", textDecoration: "underline", fontWeight: 700 }}
                    >
                      Onlayn darsga qo'shilish
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 14 }}>O'qituvchi</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: "none" }}>
                <Avatar name={next.teacherName ?? "?"} size="md" />
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: "var(--success)",
                    border: "2.5px solid var(--surface)",
                  }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14.5 }}>{next.teacherName ?? "—"}</div>
                <div style={{ display: "flex", gap: 2, marginTop: 4, color: "var(--warn)" }}>
                  {"★★★★★".split("").map((c, i) => (
                    <span key={i} style={{ fontSize: 12 }}>{c}</span>
                  ))}
                  <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: 4 }}>4.9</span>
                </div>
              </div>
            </div>
            {next.teacherPhone && (
              <a
                href={`tel:${next.teacherPhone}`}
                className="btn sm"
                style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
              >
                <Icon name="phone" size={14} /> {next.teacherPhone}
              </a>
            )}
            <a className="btn sm primary" style={{ width: "100%", justifyContent: "center" }} href="#">
              <Icon name="message" size={14} /> Xabar yuborish
            </a>
          </Card>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "var(--gap)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card>
            <div className="card-head">
              <div className="ttl">Haftalik jadval</div>
            </div>
            {(schedule ?? []).map((s) => (
              <div className="si" key={s.id}>
                <div className="si-dot" style={{ background: s.color ?? "var(--accent)" }} />
                <div style={{ flex: 1 }}>
                  <div className="si-nm">{s.groupName}</div>
                  <div className="si-mt">
                    {DAY_LABELS[s.dayOfWeek]} · {s.startTime} {s.teacherName ? `· ${s.teacherName}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {(schedule ?? []).length === 0 && <div className="empty"><Icon name="calendar" size={28} /><div>Jadval yo'q</div></div>}
          </Card>

          <Card>
            <div className="card-head">
              <div className="ttl">Dars yozuvlari</div>
            </div>
            {(recordings ?? []).map((r) => (
              <div className="si" key={r.id}>
                <div className="si-dot" style={{ background: "var(--accent)" }} />
                <div style={{ flex: 1 }}>
                  <div className="si-nm">{r.title}</div>
                  <div className="si-mt">{r.recordedDate} · ⏱ {fmtDuration(r.durationSeconds)}</div>
                </div>
                <a className="btn sm" href={r.videoUrl} target="_blank" rel="noreferrer">
                  Ko'rish
                </a>
              </div>
            ))}
            {(recordings ?? []).length === 0 && <div className="empty"><Icon name="video" size={28} /><div>Yozuvlar yo'q</div></div>}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card className="card-pad">
            <div style={{ fontWeight: 750, fontSize: 14.5, marginBottom: 14 }}>Davomat tarixi</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {(attendance?.records ?? []).map((r, i) => (
                <div
                  key={i}
                  title={`${r.date}: ${STATUS_LABEL[r.status]}`}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: STATUS_COLOR[r.status],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  {STATUS_MARK[r.status]}
                </div>
              ))}
              {(attendance?.records ?? []).length === 0 && <div className="cell-sub">Ma'lumot yo'q</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
              <div style={{ background: "color-mix(in oklab, var(--success) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--success)" }}>{attendance?.totals.p ?? 0}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Keldi</div>
              </div>
              <div style={{ background: "color-mix(in oklab, var(--warn) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--warn)" }}>{attendance?.totals.l ?? 0}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Kechikdi</div>
              </div>
              <div style={{ background: "color-mix(in oklab, var(--danger) 12%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--danger)" }}>{attendance?.totals.a ?? 0}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Kelmadi</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ color: "var(--text-faint)" }}>Umumiy davomat</span>
                <b style={{ color: "var(--success)" }}>{attendance?.percent ?? 0}%</b>
              </div>
              <div className="pbar flat">
                <span style={{ width: `${attendance?.percent ?? 0}%` }} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="card-head">
              <div className="ttl">Uy vazifalari</div>
            </div>
            {(homework ?? []).map((hw) => (
              <div className="att-row" key={hw.id} style={{ padding: "11px 16px" }}>
                <div
                  onClick={() => !hw.done && handleComplete(hw.id, hw.xpReward)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${hw.done ? "var(--success)" : "var(--border-strong)"}`,
                    background: hw.done ? "var(--success)" : "transparent",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                    cursor: hw.done ? "default" : "pointer",
                  }}
                >
                  {hw.done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 650, fontSize: 13.5, textDecoration: hw.done ? "line-through" : "none", color: hw.done ? "var(--text-faint)" : "inherit" }}>
                    {hw.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
                    {hw.dueDate && <>📅 {hw.dueDate} · </>}
                    <span style={{ color: "var(--warn)" }}>+{hw.xpReward} XP</span>
                  </div>
                </div>
                <span className={"badge " + (hw.done ? "ok" : "warn")}>{hw.done ? "Bajarildi" : "Topshiring"}</span>
              </div>
            ))}
            {(homework ?? []).length === 0 && <div className="empty"><Icon name="bookOpen" size={28} /><div>Vazifalar yo'q</div></div>}
          </Card>

          <Card>
            <div className="card-head">
              <div className="ttl">Dars materiallari</div>
            </div>
            {(materials ?? []).map((m) => (
              <div className="si" key={m.id}>
                <div className="si-dot" style={{ background: "var(--accent)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="si-nm">{m.title}</div>
                  <div className="si-mt">{m.groupName ?? ""}</div>
                </div>
                <a className="btn sm" href={`/api/v1/materials/${m.id}/download`} target="_blank" rel="noreferrer">
                  <Icon name="download" size={14} /> Yuklab olish
                </a>
              </div>
            ))}
            {(materials ?? []).length === 0 && <div className="empty"><Icon name="bookOpen" size={28} /><div>Materiallar yo'q</div></div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
