import { useMemo, useState } from "react";
import { showXp } from "@chess-school/ui";
import { useCompleteHomework, useHomework } from "../../lib/queries.js";
import { HomeworkRow } from "./LessonsPage.js";

const CARD_BG = "#111114";
const CARD_BORDER = "#1e1e22";

type FilterTab = "hammasi" | "qilinmagan" | "bajarilgan";

export default function HomeworkPage() {
  const { data: homework = [], isLoading } = useHomework();
  const completeHW = useCompleteHomework();
  const [tab, setTab] = useState<FilterTab>("hammasi");

  async function handleComplete(id: string, xp: number) {
    const res = await completeHW.mutateAsync(id);
    if (!res.alreadyCompleted) showXp(res.xpAwarded ?? xp, "Uy vazifasi bajarildi!");
  }

  // Eng so'nggi dars birinchi ko'rinadi — "tarix" ko'rinishi uchun.
  const sorted = useMemo(() => {
    return [...homework].sort((a, b) => {
      const aKey = a.lessonDate ?? a.dueDate ?? "";
      const bKey = b.lessonDate ?? b.dueDate ?? "";
      if (aKey !== bKey) return bKey.localeCompare(aKey);
      return (b.lessonTime ?? "").localeCompare(a.lessonTime ?? "");
    });
  }, [homework]);

  const filtered = sorted.filter((h) => {
    if (tab === "qilinmagan") return !h.done;
    if (tab === "bajarilgan") return h.done;
    return true;
  });

  const doneCount = homework.filter((h) => h.done).length;
  const pct = homework.length > 0 ? Math.round((doneCount / homework.length) * 100) : 0;

  return (
    <div>
      {homework.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 18, marginBottom: 20,
          background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: "16px 20px",
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f5f5f6" }}>{doneCount} / {homework.length}</div>
            <div style={{ fontSize: 11.5, color: "#8b8d98" }}>bajarilgan</div>
          </div>
          <div style={{ flex: 1, minWidth: 120, height: 6, background: "#232328", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)" }} />
          </div>
          <span style={{ fontSize: 12.5, color: "#4ade80", fontWeight: 800 }}>{pct}%</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([
          { v: "hammasi", label: "Hammasi" },
          { v: "qilinmagan", label: "Qilinmagan" },
          { v: "bajarilgan", label: "Bajarilgan" },
        ] as { v: FilterTab; label: string }[]).map((t) => (
          <div key={t.v} onClick={() => setTab(t.v)}
            style={{
              padding: "9px 16px", borderRadius: 12, cursor: "pointer",
              background: tab === t.v ? "#3b82f6" : CARD_BG,
              border: `1px solid ${tab === t.v ? "#3b82f6" : CARD_BORDER}`,
              color: tab === t.v ? "#fff" : "#c7c8d0",
              fontSize: 13.5, fontWeight: 700,
            }}>
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#65666f" }}>Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: "#f5f5f6", marginBottom: 4 }}>
              {tab === "bajarilgan" ? "Hali bajarilgan vazifa yo'q" : tab === "qilinmagan" ? "Barcha vazifalar bajarilgan!" : "Hali vazifa yo'q"}
            </div>
            <div style={{ fontSize: 13, color: "#65666f" }}>O'qituvchingiz vazifa bergach shu yerda ko'rinadi</div>
          </div>
        ) : (
          filtered.map((hw) => <HomeworkRow key={hw.id} hw={hw} onComplete={handleComplete} />)
        )}
      </div>
    </div>
  );
}
