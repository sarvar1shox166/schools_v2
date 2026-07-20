import { useState } from "react";
import {
  useHomework, useCreateHomework, useUpdateHomework, useDeleteHomework,
  useHomeworkCompletions, useMarkHomeworkDoneByTeacher,
  useTeacherSchedule, useTodaySchedule, useGroupStudents, useMarkAttendance, useAwardXp,
  type Homework, type ScheduleSlot,
} from "../../lib/queries.js";

const MONTH_FULL = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const AVATAR_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#06b6d4"];

type AttStatus = "p" | "l" | "a" | "ae";
const ATT_LABELS: { key: AttStatus; label: string; color: string }[] = [
  { key: "p", label: "Keldi", color: "#22c55e" },
  { key: "l", label: "Kechikdi", color: "#f59e0b" },
  { key: "a", label: "Kelmadi", color: "#ef4444" },
  { key: "ae", label: "Sababli", color: "#8b5cf6" },
];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDueDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getDate()}-${MONTH_FULL[dt.getMonth()]}`;
}

function pillStyle(active: boolean, color: string): React.CSSProperties {
  return active
    ? { background: color, color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "6px 10px", borderRadius: 7, cursor: "pointer" }
    : { background: "#1a1a1e", color: "#8b8d98", fontSize: 11.5, fontWeight: 500, padding: "6px 10px", borderRadius: 7, cursor: "pointer" };
}

function tabStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "#3b82f6", color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }
    : { background: "#1a1a1e", border: "1px solid #232328", color: "#8b8d98", fontSize: 12.5, fontWeight: 500, padding: "8px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" };
}

/* ── Matn muharriri asboblar paneli — dizayndagi kabi (dekorativ) ──────── */
function RichToolbar() {
  const btn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b8d98" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #2a2a30", background: "#18181c" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 20L18 8a2.8 2.8 0 000-4 2.8 2.8 0 00-4 0L2 16v4z" /><path d="M14.5 5.5L18.5 9.5" /></svg></div>
        <div style={{ ...btn, fontWeight: 800, fontSize: 13, color: "#d4d4d8" }}>B</div>
        <div style={{ ...btn, fontStyle: "italic", fontSize: 13, color: "#d4d4d8" }}>I</div>
        <div style={{ width: 32, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, color: "#d4d4d8", fontSize: 12, fontWeight: 700 }}>
          T<span style={{ fontSize: 9 }}>T</span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
        </div>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 3a6 6 0 000 12 2 2 0 012 2 2 2 0 002 2 9 9 0 000-16z" /></svg></div>
        <div style={{ width: 20, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4b52" }}>⋮</div>
        <div style={{ width: 1, height: 18, background: "#2a2a30", margin: "0 6px" }} />
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg></div>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h16" /></svg></div>
        <div style={btn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h9" /></svg></div>
        <div style={{ width: 1, height: 18, background: "#2a2a30", margin: "0 6px" }} />
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 15l6-6" /><path d="M11 6l1-1a3.5 3.5 0 015 5l-1 1" /><path d="M13 18l-1 1a3.5 3.5 0 01-5-5l1-1" /></svg></div>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5-9 9" /></svg></div>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M8 15c1 1.2 2.4 2 4 2s3-.8 4-2" /></svg></div>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="14" height="10" rx="1" /><path d="M17 9l4-2v8l-4-2" /></svg></div>
        <div style={{ ...btn, fontSize: 15, fontWeight: 700 }}>"</div>
        <div style={btn}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg></div>
        <div style={{ width: 20, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4b52" }}>⋮</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ ...btn, width: 26, height: 26 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14l-4-4 4-4" /><path d="M5 10h9a5 5 0 010 10h-1" /></svg></div>
        <div style={{ ...btn, width: 26, height: 26 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14l4-4-4-4" /><path d="M19 10h-9a5 5 0 000 10h1" /></svg></div>
        <div style={{ width: 28, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b8d98", fontSize: 12 }}>[ ]</div>
        <div style={{ width: 28, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, color: "#8b8d98" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
        </div>
        <div style={{ width: 1, height: 18, background: "#2a2a30", margin: "0 4px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderLeft: "1px solid #2a2a30", color: "#60a5fa", fontSize: 12.5, fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          Oldindan ko'rish
        </div>
      </div>
    </div>
  );
}

/* ── Bugungi guruh kartasi (davomat → vazifa → XP) ─────────────────────── */
function TodayGroupCard({ slot, studentsCount }: { slot: ScheduleSlot; studentsCount: number }) {
  const ended = !!slot.isEnded;
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const { data: students = [] } = useGroupStudents(slot.groupId);
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [hwItems, setHwItems] = useState<{ id: number; title: string; text: string }[]>([]);
  const [nextItemId, setNextItemId] = useState(1);
  const [xpAmounts, setXpAmounts] = useState<Record<string, number>>({});
  const markAttendance = useMarkAttendance();
  const createHomework = useCreateHomework();
  const awardXp = useAwardXp();
  // createHomework/awardXp mutatsiyalari bir nechta o'quvchi uchun parallel chaqiriladi —
  // ularning umumiy `isPending`si bitta chaqiruvning holatini aks ettiradi, hammasi
  // tugaguncha tugmani band qilib turish uchun alohida lokal holat ishlatiladi.
  const [savingHomework, setSavingHomework] = useState(false);
  const [finishing, setFinishing] = useState(false);

  function toggleExpand() {
    if (!ended) return;
    setExpanded((e) => !e);
    setStep(0);
  }

  function addItem() { setHwItems((items) => [...items, { id: nextItemId, title: "", text: "" }]); setNextItemId((n) => n + 1); }
  function removeItem(id: number) { setHwItems((items) => items.filter((it) => it.id !== id)); }

  async function handleAttendanceContinue() {
    const records = students.map((s) => ({ studentId: s.id, status: attendance[s.id] ?? "p" as const }));
    await markAttendance.mutateAsync({ scheduleSlotId: slot.id, date: todayStr(), records });
    setStep(1);
  }

  async function handleHomeworkContinue() {
    if (savingHomework) return;
    setSavingHomework(true);
    try {
      const validItems = hwItems.filter((it) => it.title.trim());
      if (slot.groupId) {
        await Promise.all(validItems.map((it) =>
          createHomework.mutateAsync({ groupId: slot.groupId!, title: it.title.trim(), description: it.text.trim() || undefined })
        ));
      }
      const defaults: Record<string, number> = {};
      students.forEach((s) => { defaults[s.id] = 15; });
      setXpAmounts(defaults);
      setStep(2);
    } finally {
      setSavingHomework(false);
    }
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await Promise.all(students.map((s) => {
        const amt = xpAmounts[s.id] ?? 0;
        return amt > 0 ? awardXp.mutateAsync({ studentId: s.id, amount: amt, note: "Darsdagi faollik" }) : Promise.resolve();
      }));
      setExpanded(false); setStep(0); setHwItems([]); setAttendance({});
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, overflow: "hidden" }}>
      <div onClick={toggleExpand} style={{
        padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: ended ? "pointer" : "not-allowed", opacity: ended ? 1 : .5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: slot.color ? `${slot.color}2e` : "rgba(59,130,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={slot.color ?? "#60a5fa"} strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
          </div>
          <div>
            <div style={{ color: "#f5f5f6", fontSize: 14.5, fontWeight: 600 }}>{slot.groupName ?? slot.customName ?? "Dars"}</div>
            <div style={{ color: "#65666f", fontSize: 12.5, marginTop: 2 }}>
              {slot.startTime.slice(0, 5)} – {ended ? "tugadi" : "hali boshlanmagan"} · {studentsCount} o'quvchi
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: ended ? "rgba(34,197,94,0.15)" : "rgba(139,92,246,0.15)", color: ended ? "#4ade80" : "#a78bfa",
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 9,
          }}>
            {ended ? "Tugadi" : "Kutilmoqda"}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#65666f" strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #1e1e22", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div onClick={() => setStep(0)} style={tabStyle(step === 0)}>1. Davomat</div>
            <div onClick={() => setStep(1)} style={tabStyle(step === 1)}>2. Vazifa berish</div>
            <div onClick={() => setStep(2)} style={tabStyle(step === 2)}>3. XP berish</div>
          </div>

          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {students.map((st, i) => {
                const status = attendance[st.id] ?? "p";
                return (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", borderBottom: "1px solid #1e1e22" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {initialsOf(st.fullName)}
                      </div>
                      <div style={{ color: "#f5f5f6", fontSize: 13.5, fontWeight: 500 }}>{st.fullName}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {ATT_LABELS.map((a) => (
                        <div key={a.key} onClick={() => setAttendance((s) => ({ ...s, [st.id]: a.key }))} style={pillStyle(status === a.key, a.color)}>{a.label}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={handleAttendanceContinue} disabled={markAttendance.isPending}
                  style={{ background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 9, border: "none", cursor: markAttendance.isPending ? "default" : "pointer", opacity: markAttendance.isPending ? 0.6 : 1 }}>
                  {markAttendance.isPending ? "Saqlanmoqda..." : "Davom etish →"}
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {hwItems.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, background: "#18181c", border: "1px solid #232328", borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ color: "#93c5fd", fontSize: 12.5, fontWeight: 700 }}>{idx + 1}-vazifa</div>
                    <div onClick={() => removeItem(item.id)} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(239,68,68,0.12)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>−</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ color: "#8b8d98", fontSize: 12 }}>Vazifa tavsifi</div>
                    <input value={item.title}
                      onChange={(e) => setHwItems((items) => items.map((it) => it.id === item.id ? { ...it, title: e.target.value } : it))}
                      style={{ background: "#1a1a1e", border: "1px solid #2a2a30", borderRadius: 9, padding: "11px 12px", color: "#f5f5f6", fontSize: 13.5, fontFamily: "inherit" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ color: "#8b8d98", fontSize: 12 }}>Matn</div>
                    <div style={{ border: "1px solid #2a2a30", borderRadius: 9, overflow: "hidden", background: "#141417" }}>
                      <RichToolbar />
                      <textarea value={item.text} placeholder="Vazifa matnini shu yerga yozing..."
                        onChange={(e) => setHwItems((items) => items.map((it) => it.id === item.id ? { ...it, text: e.target.value } : it))}
                        style={{ width: "100%", boxSizing: "border-box", background: "#141417", border: "none", padding: 16, color: "#f5f5f6", fontSize: 13.5, fontFamily: "inherit", minHeight: 150, resize: "vertical", outline: "none" }} />
                    </div>
                  </div>
                </div>
              ))}

              <div onClick={addItem} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, border: "1.5px dashed #2a2a30", borderRadius: 10, color: "#8b8d98", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(59,130,246,0.15)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>+</div>
                Yana vazifa qo'shish
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <div onClick={() => setStep(0)} style={{ background: "transparent", border: "1px solid #2a2a30", color: "#a3a4ad", fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 9, cursor: "pointer" }}>← Orqaga</div>
                <button type="button" onClick={handleHomeworkContinue} disabled={savingHomework}
                  style={{ background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 9, border: "none", cursor: savingHomework ? "default" : "pointer", opacity: savingHomework ? 0.6 : 1 }}>
                  {savingHomework ? "Saqlanmoqda..." : "Davom etish →"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {students.map((st, i) => (
                <div key={st.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", borderBottom: "1px solid #1e1e22" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {initialsOf(st.fullName)}
                    </div>
                    <div style={{ color: "#f5f5f6", fontSize: 13.5, fontWeight: 500 }}>{st.fullName}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
                    <input type="number" value={xpAmounts[st.id] ?? 15}
                      onChange={(e) => setXpAmounts((x) => ({ ...x, [st.id]: Number(e.target.value) }))}
                      style={{ width: 56, background: "#1a1a1e", border: "1px solid #2a2a30", borderRadius: 8, padding: "8px 10px", color: "#f5f5f6", fontSize: 13.5, fontFamily: "inherit", textAlign: "center" }} />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <div onClick={() => setStep(1)} style={{ background: "transparent", border: "1px solid #2a2a30", color: "#a3a4ad", fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 9, cursor: "pointer" }}>← Orqaga</div>
                <button type="button" onClick={handleFinish} disabled={finishing}
                  style={{ background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 18px", borderRadius: 9, border: "none", cursor: finishing ? "default" : "pointer", opacity: finishing ? 0.6 : 1 }}>
                  {finishing ? "Saqlanmoqda..." : "✓ Yakunlash"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Oldin berilgan vazifa qatori ──────────────────────────────────────── */
function HomeworkListItem({ hw }: { hw: Homework }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: hw.title, description: hw.description ?? "",
    dueDate: hw.dueDate ? hw.dueDate.slice(0, 10) : "", xpReward: hw.xpReward,
  });
  const { data: completions = [] } = useHomeworkCompletions(expanded ? hw.id : null);
  const markDone = useMarkHomeworkDoneByTeacher();
  const updateHw = useUpdateHomework();
  const deleteHw = useDeleteHomework();

  async function handleSave() {
    await updateHw.mutateAsync({
      id: hw.id, title: draft.title.trim() || undefined,
      description: draft.description.trim() || null,
      dueDate: draft.dueDate || null,
      xpReward: draft.xpReward,
    });
    setEditing(false);
  }

  const dueLabel = formatDueDate(hw.dueDate ?? null);

  return (
    <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, overflow: "hidden" }}>
      <div onClick={() => setExpanded((e) => !e)} style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 15.5v-10z" /><path d="M4 15.5A2.5 2.5 0 016.5 18H20" /></svg>
          </div>
          <div>
            <div style={{ color: "#f5f5f6", fontSize: 13.5, fontWeight: 600 }}>{hw.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              {hw.groupName && (
                <div style={{ background: hw.groupColor ?? "#3b82f6", color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 9 }}>{hw.groupName}</div>
              )}
              <div style={{ color: "#65666f", fontSize: 11.5 }}>
                {dueLabel ? `muddat ${dueLabel} · ` : ""}+{hw.xpReward} XP
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#8b8d98", fontSize: 12.5 }}>{hw.completionCount ?? 0}{hw.totalStudents != null ? `/${hw.totalStudents}` : ""} bajardi</div>
          <div onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); setExpanded(true); }}
            style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#8b8d98", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </div>
          <div onClick={(e) => { e.stopPropagation(); if (confirm("Vazifani o'chirasizmi?")) deleteHw.mutate(hw.id); }}
            style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" /><path d="M10 11v6M14 11v6" /></svg>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#65666f" strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {editing && (
        <div style={{ borderTop: "1px solid #1e1e22", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, background: "#141417", border: "1px solid #232328", borderRadius: 10 }}>
            <div style={{ color: "#93c5fd", fontSize: 12, fontWeight: 700 }}>1-vazifa</div>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Vazifa tavsifi"
              style={{ background: "#1a1a1e", border: "1px solid #2a2a30", borderRadius: 8, padding: "9px 11px", color: "#f5f5f6", fontSize: 12.5, fontFamily: "inherit" }} />
            <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Qo'shimcha izoh..."
              style={{ background: "#1a1a1e", border: "1px solid #2a2a30", borderRadius: 8, padding: "9px 11px", color: "#f5f5f6", fontSize: 12.5, fontFamily: "inherit", minHeight: 60, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div style={{ color: "#8b8d98", fontSize: 12 }}>Muddat</div>
              <input type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                style={{ background: "#1a1a1e", border: "1px solid #2a2a30", borderRadius: 9, padding: "10px 12px", color: "#f5f5f6", fontSize: 13, fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 100 }}>
              <div style={{ color: "#8b8d98", fontSize: 12 }}>XP</div>
              <input type="number" value={draft.xpReward} onChange={(e) => setDraft((d) => ({ ...d, xpReward: Number(e.target.value) }))}
                style={{ background: "#1a1a1e", border: "1px solid #2a2a30", borderRadius: 9, padding: "10px 12px", color: "#f5f5f6", fontSize: 13, fontFamily: "inherit" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div onClick={() => { setEditing(false); if (confirm("Vazifani o'chirasizmi?")) deleteHw.mutate(hw.id); }}
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
              Vazifani o'chirish
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => setEditing(false)} style={{ background: "transparent", border: "1px solid #2a2a30", color: "#a3a4ad", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>Bekor qilish</div>
              <div onClick={handleSave} style={{ background: "#3b82f6", color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>Saqlash</div>
            </div>
          </div>
        </div>
      )}

      {expanded && !editing && (
        <div style={{ borderTop: "1px solid #1e1e22", padding: "4px 18px 12px" }}>
          {completions.map((row) => (
            <div key={row.studentId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1a1a1e" }}>
              <div style={{ color: "#d4d4d8", fontSize: 12.5 }}>{row.fullName}</div>
              <div
                onClick={() => !row.done && markDone.mutate({ homeworkId: hw.id, studentId: row.studentId })}
                style={{
                  background: row.done ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)", color: row.done ? "#4ade80" : "#f87171",
                  fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 7, cursor: row.done ? "default" : "pointer",
                }}>
                {row.done ? "✓ Bajardi" : "Bajarmadi"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Asosiy sahifa ──────────────────────────────────────────────────────── */
export default function TMaterialsPage() {
  const { data: teacherSchedule } = useTeacherSchedule();
  const { data: todaySlots = [] } = useTodaySchedule();
  const { data: homework = [], isLoading: hwLoading } = useHomework();

  const todayGroups = todaySlots.filter((s) => s.groupId);
  const now = new Date();
  const todayLabel = `${now.getDate()}-${MONTH_FULL[now.getMonth()]}`;

  return (
    <div style={{ background: "#0a0a0c", minHeight: "calc(100vh - 60px)", margin: "-26px -28px -60px", padding: "32px 40px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#f5f5f6", fontSize: 20, fontWeight: 700 }}>Uy vazifalari</div>
        <div style={{ color: "#8b8d98", fontSize: 13, marginTop: 2 }}>Bugun, {todayLabel} — dars o'tgan guruhlaringiz shu yerda ko'rinadi</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
        {todayGroups.length === 0 && (
          <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: "24px 18px", textAlign: "center", color: "#65666f", fontSize: 13 }}>
            Bugunga rejalashtirilgan dars yo'q
          </div>
        )}
        {todayGroups.map((slot) => (
          <TodayGroupCard key={slot.id} slot={slot}
            studentsCount={teacherSchedule?.groups.find((g) => g.id === slot.groupId)?.studentsCount ?? 0} />
        ))}
      </div>

      <div style={{ color: "#65666f", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 12 }}>OLDIN BERILGAN VAZIFALAR</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {hwLoading ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#65666f" }}>Yuklanmoqda...</div>
        ) : homework.length === 0 ? (
          <div style={{ background: "#141417", border: "1px solid #232328", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#65666f" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "#a3a4ad" }}>Hali vazifa berilmagan</div>
            <div style={{ fontSize: 13 }}>Bugun dars o'tgan guruhingizni ochib vazifa bering</div>
          </div>
        ) : homework.map((hw) => <HomeworkListItem key={hw.id} hw={hw} />)}
      </div>
    </div>
  );
}
