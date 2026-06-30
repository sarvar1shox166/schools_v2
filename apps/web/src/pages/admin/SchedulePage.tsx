import { useMemo, useState } from "react";
import { Avatar, Card, Icon, StatCard } from "@chess-school/ui";
import {
  useCreateScheduleSlot, useUpdateScheduleSlot, useDeleteScheduleSlot,
  useGroups, useSchedule, type ScheduleSlot, type CreateSlotPayload,
} from "../../lib/queries.js";

const DAYS = ["Dus", "Ses", "Cho", "Pay", "Jum", "Sha", "Yak"];
const DAY_SHORT = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];
const HOURS = [
  "08:00","09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00",
];

type ModalState =
  | { mode: "view"; slot: ScheduleSlot }
  | { mode: "add"; day: number; hour: string }
  | { mode: "edit"; slot: ScheduleSlot }
  | null;

function getGroupDays(slots: ScheduleSlot[], groupId: string): string {
  return slots
    .filter((s) => s.groupId === groupId)
    .map((s) => s.dayOfWeek)
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d])
    .join("·");
}

export default function SchedulePage() {
  const { data: slots = [], isLoading } = useSchedule();
  const { data: groups = [] } = useGroups();
  const createSlot = useCreateScheduleSlot();
  const updateSlot = useUpdateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();

  const [modal, setModal] = useState<ModalState>(null);
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);

  const teachers = useMemo(
    () => [...new Set(slots.map((s) => s.teacherName).filter(Boolean) as string[])],
    [slots]
  );

  const filteredSlots = teacherFilter
    ? slots.filter((s) => s.teacherName === teacherFilter)
    : slots;

  const grid = useMemo(() => {
    const map = new Map<string, ScheduleSlot[]>();
    for (const h of HOURS) for (let d = 0; d < 7; d++) map.set(`${h}-${d}`, []);
    for (const s of filteredSlots) {
      const key = `${String(s.startTime).slice(0, 5)}-${s.dayOfWeek}`;
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [filteredSlots]);

  const totalLessons = slots.length;
  const totalHours = Number((totalLessons * 1.5).toFixed(1));
  const activeGroups = new Set(slots.map((s) => s.groupId)).size;
  const emptySlots = HOURS.length * 7 - totalLessons;

  async function handleCreate(form: CreateSlotPayload) {
    await createSlot.mutateAsync(form);
    setModal(null);
  }

  async function handleUpdate(id: string, patch: Partial<CreateSlotPayload>) {
    await updateSlot.mutateAsync({ id, ...patch });
    setModal(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu darsni o'chirishni tasdiqlaysizmi?")) return;
    await deleteSlot.mutateAsync(id);
    setModal(null);
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-faint)" }}>
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Haftalik dars jadvali
        </h2>
        <button className="btn primary" onClick={() => setModal({ mode: "add", day: 0, hour: "09:00" })}>
          <Icon name="plus" size={15} /> Dars qo'shish
        </button>
      </div>

      {/* Teacher filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={"chip" + (teacherFilter === null ? " on" : "")}
          onClick={() => setTeacherFilter(null)}
          style={{ fontWeight: 700 }}
        >
          Barchasi
        </button>
        {teachers.map((t) => (
          <button
            key={t}
            className={"chip" + (teacherFilter === t ? " on" : "")}
            onClick={() => setTeacherFilter(teacherFilter === t ? null : t)}
          >
            <Avatar name={t} size="sm" />
            {t.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Weekly grid */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={thTime}>Vaqt</th>
                {DAYS.map((d) => <th key={d} style={thDay}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td style={tdTime}>{hour}</td>
                  {DAYS.map((_, di) => {
                    const cellSlots = grid.get(`${hour}-${di}`) ?? [];
                    return (
                      <td key={di} style={tdCell}>
                        {cellSlots.length > 0 ? (
                          cellSlots.map((s) => (
                            <LessonCard
                              key={s.id}
                              slot={s}
                              onClick={() => setModal({ mode: "view", slot: s })}
                            />
                          ))
                        ) : (
                          <EmptyCell onClick={() => setModal({ mode: "add", day: di, hour })} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid cols-4">
        <StatCard icon="calendar" tone="i" value={String(totalLessons)} label="Haftalik darslar" />
        <StatCard icon="clock" tone="i" value={`${totalHours} soat`} label="Dars vaqtlari" />
        <StatCard icon="groups" tone="s" value={`${activeGroups} guruh`} label="Faol guruhlar" />
        <StatCard icon="alert" tone="d" value={String(emptySlots)} label="Bo'sh vaqtlar"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>qizil = bo'sh</span>}
        />
      </div>

      {/* Modals */}
      {modal && (
        <ModalOverlay onClose={() => setModal(null)}>
          {modal.mode === "view" && (
            <ViewModal
              slot={modal.slot}
              allSlots={slots}
              onClose={() => setModal(null)}
              onEdit={() => setModal({ mode: "edit", slot: modal.slot })}
              onDelete={() => handleDelete(modal.slot.id)}
              isDeleting={deleteSlot.isPending}
            />
          )}
          {modal.mode === "add" && (
            <AddModal
              day={modal.day}
              hour={modal.hour}
              groups={groups}
              onClose={() => setModal(null)}
              onCreate={handleCreate}
              isPending={createSlot.isPending}
            />
          )}
          {modal.mode === "edit" && (
            <EditModal
              slot={modal.slot}
              allSlots={slots}
              onClose={() => setModal(null)}
              onSave={handleUpdate}
              isPending={updateSlot.isPending}
            />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

/* ─── Modal overlay ─── */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function ModalBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface)", borderRadius: 20, padding: "28px 32px",
      width: 480, maxWidth: "calc(100vw - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,.25)",
      maxHeight: "90vh", overflowY: "auto",
    }}>
      {children}
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      <button
        onClick={onClose}
        style={{
          width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--surface-2)", display: "grid", placeItems: "center",
          cursor: "pointer", color: "var(--text-dim)", flexShrink: 0,
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

/* ─── View modal ─── */
function ViewModal({ slot, allSlots, onClose, onEdit, onDelete, isDeleting }: {
  slot: ScheduleSlot; allSlots: ScheduleSlot[]; onClose: () => void; onEdit: () => void;
  onDelete: () => void; isDeleting: boolean;
}) {
  const color = slot.color ?? "#3F8CFF";
  const kunlar = slot.groupId ? getGroupDays(allSlots, slot.groupId) : "";

  return (
    <ModalBox>
      <ModalHeader title="Dars ma'lumotlari" onClose={onClose} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${color}22`, display: "grid", placeItems: "center", fontSize: 22,
        }}>♟</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>
            {slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
            {slot.lessonType === "individual" ? "Individual dars" : slot.lessonType === "diagnostika" ? "Diagnostika" : "Guruh darsi"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {[
          { label: "O'qituvchi", value: slot.teacherName ?? "—" },
          { label: "Vaqt", value: String(slot.startTime).slice(0, 5) },
          { label: "Kunlar", value: kunlar || DAY_SHORT[slot.dayOfWeek] },
          { label: "Xona", value: slot.roomName ?? "—" },
          { label: "Format", value: slot.isOnline ? `Online (${slot.meetingPlatform === "meet" ? "Google Meet" : "Zoom"})` : "Offline" },
          ...(slot.meetingUrl ? [{ label: "Havola", value: slot.meetingUrl }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "13px 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ color: "var(--text-faint)", fontSize: 14 }}>{label}</span>
            <span style={{ fontWeight: 700, fontSize: 14, maxWidth: 260, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button
          className="btn"
          style={{ flex: 1, color: "var(--danger)", borderColor: "var(--danger)" }}
          disabled={isDeleting}
          onClick={onDelete}
        >
          <Icon name="trash" size={14} /> {isDeleting ? "..." : "O'chirish"}
        </button>
        <button className="btn primary" style={{ flex: 2 }} onClick={onEdit}>
          <Icon name="edit" size={14} /> Tahrirlash
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Add modal ─── */
function AddModal({ day, hour, groups, onClose, onCreate, isPending }: {
  day: number; hour: string;
  groups: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (f: CreateSlotPayload) => void;
  isPending: boolean;
}) {
  const [lessonType, setLessonType] = useState<"guruh" | "individual" | "diagnostika">("guruh");
  const [form, setForm] = useState({
    groupId: groups[0]?.id ?? "",
    customName: "",
    day: String(day),
    time: hour,
    isOnline: false,
    meetingPlatform: "zoom" as "zoom" | "meet",
    meetingUrl: "",
  });

  const isGroupMode = lessonType === "guruh";
  const canSubmit = isGroupMode ? !!form.groupId : !!form.customName.trim();

  return (
    <ModalBox>
      <ModalHeader title={`Dars qo'shish — ${DAYS[day]} ${hour}`} onClose={onClose} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Lesson type */}
        <div>
          <label style={labelStyle}>DARS TURI</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["guruh", "individual", "diagnostika"] as const).map((t) => (
              <button key={t} onClick={() => setLessonType(t)}
                style={{
                  flex: 1, padding: "9px 4px", borderRadius: 8, cursor: "pointer",
                  border: lessonType === t ? "none" : "1px solid var(--border)",
                  background: lessonType === t ? "var(--accent)" : "var(--surface-2)",
                  color: lessonType === t ? "#fff" : "var(--text-dim)",
                  fontWeight: 700, fontSize: 12, textTransform: "capitalize",
                }}>
                {t === "guruh" ? "Guruh" : t === "individual" ? "Individual" : "Diagnostika"}
              </button>
            ))}
          </div>
        </div>

        {/* Group or custom name */}
        {isGroupMode ? (
          <div>
            <label style={labelStyle}>GURUH</label>
            <select className="inp" style={{ width: "100%" }} value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Guruh tanlang...</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>DARS NOMI</label>
            <input className="inp" style={{ width: "100%" }}
              placeholder={lessonType === "individual" ? "Masalan: Ali bilan individual dars" : "Masalan: Yangi o'quvchi diagnostikasi"}
              value={form.customName}
              onChange={(e) => setForm({ ...form, customName: e.target.value })} />
          </div>
        )}

        {/* Day & time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>HAFTA KUNI</label>
            <select className="inp" style={{ width: "100%" }} value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>VAQT</label>
            <select className="inp" style={{ width: "100%" }} value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        {/* Online toggle */}
        <div>
          <label style={labelStyle}>FORMAT</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: false, label: "Offline" }, { v: true, label: "Online" }].map(({ v, label }) => (
              <button key={String(v)} onClick={() => setForm({ ...form, isOnline: v })}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                  border: form.isOnline === v ? "none" : "1px solid var(--border)",
                  background: form.isOnline === v ? "var(--accent)" : "var(--surface-2)",
                  color: form.isOnline === v ? "#fff" : "var(--text-dim)",
                  fontWeight: 600, fontSize: 13,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform + URL when online */}
        {form.isOnline && (
          <>
            <div>
              <label style={labelStyle}>PLATFORMA</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["zoom", "meet"] as const).map((p) => (
                  <button key={p} onClick={() => setForm({ ...form, meetingPlatform: p })}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                      border: form.meetingPlatform === p ? "none" : "1px solid var(--border)",
                      background: form.meetingPlatform === p ? (p === "zoom" ? "#2D8CFF" : "#1a73e8") : "var(--surface-2)",
                      color: form.meetingPlatform === p ? "#fff" : "var(--text-dim)",
                      fontWeight: 700, fontSize: 13,
                    }}>
                    {p === "zoom" ? "🎥 Zoom" : "🟢 Google Meet"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>HAVOLA (ixtiyoriy)</label>
              <input className="inp" style={{ width: "100%" }}
                placeholder={form.meetingPlatform === "zoom" ? "https://zoom.us/j/..." : "https://meet.google.com/..."}
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} />
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                Bo'sh qoldirsangiz avtomatik havola yaratiladi
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button className="btn primary" style={{ flex: 2 }}
          disabled={!canSubmit || isPending}
          onClick={() => onCreate({
            lessonType,
            groupId: isGroupMode ? form.groupId : undefined,
            customName: isGroupMode ? undefined : form.customName.trim(),
            dayOfWeek: Number(form.day),
            startTime: form.time,
            isOnline: form.isOnline,
            meetingPlatform: form.isOnline ? form.meetingPlatform : undefined,
            meetingUrl: form.isOnline && form.meetingUrl ? form.meetingUrl : undefined,
          })}>
          <Icon name="check" size={14} /> {isPending ? "Saqlanmoqda..." : "Qo'shish"}
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Edit modal ─── */
function EditModal({ slot, allSlots, onClose, onSave, isPending }: {
  slot: ScheduleSlot; allSlots: ScheduleSlot[]; onClose: () => void;
  onSave: (id: string, patch: Partial<CreateSlotPayload>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    lessonType: (slot.lessonType ?? "guruh") as "guruh" | "individual" | "diagnostika",
    customName: slot.customName ?? "",
    day: String(slot.dayOfWeek),
    time: String(slot.startTime).slice(0, 5),
    isOnline: slot.isOnline ?? false,
    meetingPlatform: (slot.meetingPlatform ?? "zoom") as "zoom" | "meet",
    meetingUrl: slot.meetingUrl ?? "",
  });

  const color = slot.color ?? "#3F8CFF";
  const displayName = slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—");

  return (
    <ModalBox>
      <ModalHeader title="Darsni tahrirlash" onClose={onClose} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `${color}22`, display: "grid", placeItems: "center", fontSize: 20,
        }}>♟</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{displayName}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
            {slot.groupId ? (getGroupDays(allSlots, slot.groupId) || DAY_SHORT[slot.dayOfWeek]) : DAY_SHORT[slot.dayOfWeek]}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Lesson type */}
        <div>
          <label style={labelStyle}>DARS TURI</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["guruh", "individual", "diagnostika"] as const).map((t) => (
              <button key={t} onClick={() => setForm({ ...form, lessonType: t })}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer",
                  border: form.lessonType === t ? "none" : "1px solid var(--border)",
                  background: form.lessonType === t ? "var(--accent)" : "var(--surface-2)",
                  color: form.lessonType === t ? "#fff" : "var(--text-dim)",
                  fontWeight: 700, fontSize: 12,
                }}>
                {t === "guruh" ? "Guruh" : t === "individual" ? "Individual" : "Diagnostika"}
              </button>
            ))}
          </div>
        </div>

        {/* Custom name for non-group */}
        {form.lessonType !== "guruh" && (
          <div>
            <label style={labelStyle}>DARS NOMI</label>
            <input className="inp" style={{ width: "100%" }}
              placeholder="Dars nomini kiriting..."
              value={form.customName}
              onChange={(e) => setForm({ ...form, customName: e.target.value })} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>HAFTA KUNI</label>
            <select className="inp" style={{ width: "100%" }} value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>VAQT</label>
            <input className="inp" type="time" style={{ width: "100%" }} value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>FORMAT</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: false, label: "Offline" }, { v: true, label: "Online" }].map(({ v, label }) => (
              <button key={String(v)} onClick={() => setForm({ ...form, isOnline: v })}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                  border: form.isOnline === v ? "none" : "1px solid var(--border)",
                  background: form.isOnline === v ? "var(--accent)" : "var(--surface-2)",
                  color: form.isOnline === v ? "#fff" : "var(--text-dim)",
                  fontWeight: 600, fontSize: 13,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.isOnline && (
          <>
            <div>
              <label style={labelStyle}>PLATFORMA</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["zoom", "meet"] as const).map((p) => (
                  <button key={p} onClick={() => setForm({ ...form, meetingPlatform: p })}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                      border: form.meetingPlatform === p ? "none" : "1px solid var(--border)",
                      background: form.meetingPlatform === p ? (p === "zoom" ? "#2D8CFF" : "#1a73e8") : "var(--surface-2)",
                      color: form.meetingPlatform === p ? "#fff" : "var(--text-dim)",
                      fontWeight: 700, fontSize: 13,
                    }}>
                    {p === "zoom" ? "🎥 Zoom" : "🟢 Google Meet"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>HAVOLA</label>
              <input className="inp" style={{ width: "100%" }}
                placeholder={form.meetingPlatform === "zoom" ? "https://zoom.us/j/..." : "https://meet.google.com/..."}
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} />
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button className="btn primary" style={{ flex: 2 }} disabled={isPending}
          onClick={() => onSave(slot.id, {
            lessonType: form.lessonType,
            customName: form.lessonType !== "guruh" ? form.customName.trim() : undefined,
            dayOfWeek: Number(form.day),
            startTime: form.time,
            isOnline: form.isOnline,
            meetingPlatform: form.isOnline ? form.meetingPlatform : undefined,
            meetingUrl: form.isOnline && form.meetingUrl ? form.meetingUrl : undefined,
          })}>
          <Icon name="check" size={14} /> {isPending ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Lesson card cell ─── */
function LessonCard({ slot, onClick }: { slot: ScheduleSlot; onClick: () => void }) {
  const color = slot.color ?? "#3F8CFF";
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 8, padding: "7px 10px",
        borderLeft: `3px solid ${color}`,
        background: `${color}1a`,
        height: "100%", boxSizing: "border-box",
        cursor: "pointer", transition: "filter .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
    >
      <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, color: "var(--text)" }}>
        {slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—")}
      </div>
      <div style={{ fontSize: 11, marginTop: 3, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {slot.lessonType !== "guruh" && (
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>
            {slot.lessonType === "individual" ? "ind." : "diag."}
          </span>
        )}
        <span style={{ color, fontWeight: 700 }}>
          {slot.isOnline ? (slot.meetingPlatform === "meet" ? "meet" : "zoom") : "offline"}
        </span>
        {slot.teacherName && (
          <span style={{ color: "var(--text-faint)" }}>
            {slot.teacherName.split(" ").slice(0, 2).map((w, i) => i === 0 ? w : w[0] + ".").join(" ")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Empty cell ─── */
function EmptyCell({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        height: "100%", minHeight: 52,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2, borderRadius: 6, cursor: "pointer",
        background: "color-mix(in oklab, #ef4444 5%, var(--surface))",
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in oklab, #ef4444 10%, var(--surface))")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "color-mix(in oklab, #ef4444 5%, var(--surface))")}
    >
      <span style={{ fontSize: 17, color: "#fca5a5", lineHeight: 1, fontWeight: 300 }}>+</span>
      <span style={{ fontSize: 10, color: "#fca5a5", fontWeight: 700 }}>Bo'sh</span>
    </div>
  );
}

/* ─── Shared styles ─── */
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.06em", color: "var(--text-faint)",
  marginBottom: 6, textTransform: "uppercase",
};

const thTime: React.CSSProperties = {
  width: 72, padding: "12px 8px 12px 20px",
  textAlign: "left", fontSize: 12, fontWeight: 700,
  color: "var(--text-faint)", borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
};
const thDay: React.CSSProperties = {
  textAlign: "center", fontSize: 13, fontWeight: 700,
  padding: "12px 8px", borderBottom: "1px solid var(--border)",
  background: "var(--surface)", color: "var(--text)",
};
const tdTime: React.CSSProperties = {
  width: 72, padding: "4px 8px 4px 20px",
  fontSize: 12.5, fontWeight: 700,
  color: "var(--text-faint)", textAlign: "center",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle", background: "var(--surface)",
  fontVariantNumeric: "tabular-nums",
};
const tdCell: React.CSSProperties = {
  padding: 4, height: 60,
  borderBottom: "1px solid var(--border)",
  borderLeft: "1px solid var(--border)",
  verticalAlign: "top",
};
