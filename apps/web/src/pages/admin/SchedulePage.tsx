import { useMemo, useState } from "react";
import { Avatar, Card, Icon, StatCard } from "@chess-school/ui";
import { useCreateScheduleSlot, useGroups, useSchedule } from "../../lib/queries.js";

const DAYS = ["Dus", "Ses", "Cho", "Pay", "Jum", "Sha", "Yak"];
const DAY_SHORT = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];
const HOURS = [
  "08:00","09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00",
];

type Slot = {
  id: string;
  groupName: string;
  level?: string;
  teacherName: string | null;
  dayOfWeek: number;
  startTime: string;
  color: string | null;
  isOnline?: boolean;
  slotType?: string;
  room?: string;
  capacity?: number;
  enrolled?: number;
};

type ModalState =
  | { mode: "view"; slot: Slot }
  | { mode: "add"; day: number; hour: string }
  | { mode: "edit"; slot: Slot }
  | null;

const MOCK_SLOTS: Slot[] = [
  { id:"m1",  groupName:"Boshlang'ich — A", level:"Boshlang'ich", teacherName:"Nigora Saidova",  dayOfWeek:0, startTime:"09:00", color:"#3F8CFF", slotType:"guruh",      room:"1-zal", capacity:14, enrolled:12 },
  { id:"m2",  groupName:"Boshlang'ich — A", level:"Boshlang'ich", teacherName:"Nigora Saidova",  dayOfWeek:2, startTime:"09:00", color:"#3F8CFF", slotType:"guruh",      room:"1-zal", capacity:14, enrolled:12 },
  { id:"m3",  groupName:"Boshlang'ich — A", level:"Boshlang'ich", teacherName:"Nigora Saidova",  dayOfWeek:4, startTime:"09:00", color:"#3F8CFF", slotType:"guruh",      room:"1-zal", capacity:14, enrolled:12 },
  { id:"m4",  groupName:"Taktika — B",      level:"O'rta",        teacherName:"Malika Yusupova", dayOfWeek:1, startTime:"11:00", color:"#10b981", slotType:"guruh",      room:"2-zal", capacity:12, enrolled:8  },
  { id:"m5",  groupName:"Taktika — B",      level:"O'rta",        teacherName:"Malika Yusupova", dayOfWeek:3, startTime:"11:00", color:"#10b981", slotType:"guruh",      room:"2-zal", capacity:12, enrolled:8  },
  { id:"m6",  groupName:"Taktika — B",      level:"O'rta",        teacherName:"Malika Yusupova", dayOfWeek:5, startTime:"11:00", color:"#10b981", slotType:"guruh",      room:"2-zal", capacity:12, enrolled:8  },
  { id:"m7",  groupName:"Bolalar kursi — C",level:"Boshlang'ich", teacherName:"Bobur Rahimov",   dayOfWeek:0, startTime:"14:00", color:"#f59e0b", slotType:"guruh",      room:"1-zal", capacity:16, enrolled:15 },
  { id:"m8",  groupName:"Bolalar kursi — C",level:"Boshlang'ich", teacherName:"Bobur Rahimov",   dayOfWeek:2, startTime:"14:00", color:"#f59e0b", slotType:"guruh",      room:"1-zal", capacity:16, enrolled:15 },
  { id:"m9",  groupName:"Bolalar kursi — C",level:"Boshlang'ich", teacherName:"Bobur Rahimov",   dayOfWeek:4, startTime:"14:00", color:"#f59e0b", slotType:"guruh",      room:"1-zal", capacity:16, enrolled:15 },
  { id:"m10", groupName:"Pro Trening",       level:"Ilg'or",       teacherName:"Sardor Nazarov",  dayOfWeek:5, startTime:"10:00", color:"#ec4899", slotType:"individual", room:"3-zal", capacity:1,  enrolled:1  },
  { id:"m11", groupName:"Pro Trening",       level:"Ilg'or",       teacherName:"Sardor Nazarov",  dayOfWeek:6, startTime:"10:00", color:"#ec4899", slotType:"individual", room:"3-zal", capacity:1,  enrolled:1  },
  { id:"m12", groupName:"Pozitsion — D",     level:"O'rta",        teacherName:"Dilnoza Ergasheva",dayOfWeek:1,startTime:"16:00", color:"#8b5cf6", slotType:"individual", room:"2-zal", capacity:12, enrolled:10 },
  { id:"m13", groupName:"Pozitsion — D",     level:"O'rta",        teacherName:"Dilnoza Ergasheva",dayOfWeek:3,startTime:"16:00", color:"#8b5cf6", slotType:"individual", room:"2-zal", capacity:12, enrolled:10 },
  { id:"m14", groupName:"Blitz klub — F",    level:"Ilg'or",       teacherName:"Jasur Toshmatov", dayOfWeek:3, startTime:"18:00", color:"#06b6d4", slotType:"guruh",      room:"2-zal", capacity:14, enrolled:11 },
  { id:"m15", groupName:"Blitz klub — F",    level:"Ilg'or",       teacherName:"Jasur Toshmatov", dayOfWeek:5, startTime:"18:00", color:"#06b6d4", slotType:"guruh",      room:"2-zal", capacity:14, enrolled:11 },
];

function getGroupDays(slots: Slot[], groupName: string): string {
  return slots
    .filter((s) => s.groupName === groupName)
    .map((s) => s.dayOfWeek)
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d])
    .join("·");
}

export default function SchedulePage() {
  const { data: apiSlots } = useSchedule();
  const { data: groups } = useGroups();
  const createSlot = useCreateScheduleSlot();

  const [modal, setModal] = useState<ModalState>(null);
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);

  const slots: Slot[] = apiSlots && apiSlots.length > 0 ? apiSlots : MOCK_SLOTS;

  const teachers = useMemo(
    () => [...new Set(slots.map((s) => s.teacherName).filter(Boolean) as string[])],
    [slots]
  );

  const filteredSlots = teacherFilter
    ? slots.filter((s) => s.teacherName === teacherFilter)
    : slots;

  const grid = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const h of HOURS) for (let d = 0; d < 7; d++) map.set(`${h}-${d}`, []);
    for (const s of filteredSlots) {
      const key = `${s.startTime.slice(0, 5)}-${s.dayOfWeek}`;
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [filteredSlots]);

  const totalLessons = slots.length;
  const totalHours = Number((totalLessons * 1.5).toFixed(1));
  const activeGroups = new Set(slots.map((s) => s.groupName)).size;
  const emptySlots = HOURS.length * 7 - totalLessons;

  async function handleCreate(form: { groupId: string; dayOfWeek: number; startTime: string; isOnline: boolean }) {
    if (!form.groupId) return;
    await createSlot.mutateAsync(form);
    setModal(null);
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
            />
          )}
          {modal.mode === "add" && (
            <AddModal
              day={modal.day}
              hour={modal.hour}
              groups={groups ?? []}
              teachers={teachers}
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
function ViewModal({ slot, allSlots, onClose, onEdit }: {
  slot: Slot; allSlots: Slot[]; onClose: () => void; onEdit: () => void;
}) {
  const color = slot.color ?? "#3F8CFF";
  const kunlar = getGroupDays(allSlots, slot.groupName);

  return (
    <ModalBox>
      <ModalHeader title="Dars ma'lumotlari" onClose={onClose} />

      {/* Group header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${color}22`, display: "grid", placeItems: "center",
          fontSize: 22,
        }}>
          ♟
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{slot.groupName}</div>
          {slot.level && <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>{slot.level}</div>}
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {[
          { label: "O'qituvchi", value: slot.teacherName ?? "—" },
          { label: "Vaqt",       value: slot.startTime.slice(0, 5) },
          { label: "Kunlar",     value: kunlar || DAY_SHORT[slot.dayOfWeek] },
          { label: "Xona",       value: slot.room ?? "—" },
          { label: "Turi",       value: slot.slotType === "individual" ? "Individual" : "Guruh" },
          { label: "O'quvchilar",value: slot.enrolled != null ? `${slot.enrolled}/${slot.capacity} o'rin` : "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "13px 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ color: "var(--text-faint)", fontSize: 14 }}>{label}</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1, color: "var(--danger)", borderColor: "var(--danger)" }}>
          <Icon name="trash" size={14} /> O'chirish
        </button>
        <button className="btn primary" style={{ flex: 2 }} onClick={onEdit}>
          <Icon name="edit" size={14} /> Tahrirlash
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Add modal ─── */
function AddModal({ day, hour, groups, teachers, onClose, onCreate, isPending }: {
  day: number; hour: string;
  groups: { id: string; name: string }[];
  teachers: string[];
  onClose: () => void;
  onCreate: (f: { groupId: string; dayOfWeek: number; startTime: string; isOnline: boolean }) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: "", teacher: teachers[0] ?? "", day: String(day), time: hour, type: "guruh",
  });

  const title = `Dars qo'shish — ${DAYS[day]} ${hour}`;

  return (
    <ModalBox>
      <ModalHeader title={title} onClose={onClose} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Group name */}
        <div>
          <label style={labelStyle}>GURUH / DARS NOMI</label>
          <input
            className="inp"
            style={{ width: "100%" }}
            placeholder="Boshlang'ich A"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {/* Teacher */}
        <div>
          <label style={labelStyle}>O'QITUVCHI</label>
          <select
            className="inp"
            style={{ width: "100%" }}
            value={form.teacher}
            onChange={(e) => setForm({ ...form, teacher: e.target.value })}
          >
            <option value="">Tanlang...</option>
            {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        {/* Day / Time / Type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>KUN</label>
            <select className="inp" style={{ width: "100%" }} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>VAQT</label>
            <select className="inp" style={{ width: "100%" }} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>TURI</label>
            <select className="inp" style={{ width: "100%" }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="guruh">guruh</option>
              <option value="individual">individual</option>
            </select>
          </div>
        </div>

        {/* Info box */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 14px", borderRadius: 10,
          background: "color-mix(in oklab, #ef4444 8%, var(--surface))",
          border: "1px solid color-mix(in oklab, #ef4444 20%, var(--border))",
        }}>
          <Icon name="calendar" size={16} style={{ color: "var(--danger)", marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--danger)", lineHeight: 1.4 }}>
            Bu vaqt bo'sh — diagnostika yoki yangi dars qo'yish mumkin
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button
          className="btn primary"
          style={{ flex: 2 }}
          disabled={!form.name || isPending}
          onClick={() => onCreate({ groupId: form.teacher, dayOfWeek: Number(form.day), startTime: form.time, isOnline: false })}
        >
          <Icon name="check" size={14} /> Qo'shish
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Edit modal ─── */
function EditModal({ slot, allSlots, onClose }: {
  slot: Slot; allSlots: Slot[]; onClose: () => void;
}) {
  const kunlar = getGroupDays(allSlots, slot.groupName);
  const [form, setForm] = useState({
    name: slot.groupName,
    teacher: slot.teacherName ?? "",
    kunlar,
    time: slot.startTime.slice(0, 5),
    room: slot.room ?? "",
    type: slot.slotType ?? "guruh",
    capacity: String(slot.capacity ?? ""),
  });

  const color = slot.color ?? "#3F8CFF";

  return (
    <ModalBox>
      <ModalHeader title="Darsni tahrirlash" onClose={onClose} />

      {/* Group header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${color}22`, display: "grid", placeItems: "center", fontSize: 22,
        }}>
          ♟
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{slot.groupName}</div>
          {slot.level && <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>{slot.level}</div>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>GURUH / DARS NOMI</label>
          <input className="inp" style={{ width: "100%" }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        {/* Teacher */}
        <div>
          <label style={labelStyle}>O'QITUVCHI</label>
          <input className="inp" style={{ width: "100%" }} value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
        </div>

        {/* Days + Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>KUNLAR</label>
            <input className="inp" style={{ width: "100%" }} value={form.kunlar} onChange={(e) => setForm({ ...form, kunlar: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>VAQT</label>
            <input className="inp" type="time" style={{ width: "100%" }} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>

        {/* Room + Type + Capacity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>XONA</label>
            <input className="inp" style={{ width: "100%" }} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>TURI</label>
            <select className="inp" style={{ width: "100%" }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="guruh">guruh</option>
              <option value="individual">individual</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>SIG'IM</label>
            <input className="inp" type="number" style={{ width: "100%" }} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button className="btn primary" style={{ flex: 2 }} onClick={onClose}>
          <Icon name="check" size={14} /> Saqlash
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Lesson card cell ─── */
function LessonCard({ slot, onClick }: { slot: Slot; onClick: () => void }) {
  const color = slot.color ?? "#3F8CFF";
  const type = slot.slotType ?? "guruh";
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
        {slot.groupName}
      </div>
      <div style={{ fontSize: 11, marginTop: 3 }}>
        <span style={{ color, fontWeight: 700 }}>{type}</span>
        {slot.teacherName && (
          <span style={{ color: "var(--text-faint)" }}>
            {" "}{slot.teacherName.split(" ").slice(0, 2).map((w, i) => i === 0 ? w : w[0] + ".").join(" ")}
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
