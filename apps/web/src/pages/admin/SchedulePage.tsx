import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, Card, Icon, StatCard } from "@chess-school/ui";
import {
  useCreateScheduleSlot, useUpdateScheduleSlot, useDeleteScheduleSlot,
  useGroups, useSchedule, useTeachers, type ScheduleSlot, type CreateSlotPayload, type Teacher,
  useScheduleExceptions, useCreateScheduleException, useDeleteScheduleException,
  useCreateHoliday, useDeleteHoliday, useScheduleOccurrences, type ScheduleOccurrenceSlot,
  type ScheduleException,
} from "../../lib/queries.js";

const DAY_SHORT = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];
const DAY_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const HOURS = [
  "08:00","09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00",
];

/* ─── Sana yordamchilari (mahalliy vaqt zonasida, UTC ko'chishisiz) ─── */
function dayOfWeekOf(d: Date): number {
  return (d.getDay() + 6) % 7; // 0=Dushanba..6=Yakshanba
}
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function mondayOf(d: Date): Date {
  return addDays(d, -dayOfWeekOf(d));
}
/** Backend DATE ustunlarini to'liq ISO timestamp sifatida qaytarishi mumkin — faqat sana qismini ko'rsatamiz. */
function fmtDate(d: string | null | undefined): string {
  return d ? d.slice(0, 10) : "";
}
function fmtDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()].toLowerCase()}, ${DAY_FULL[dayOfWeekOf(d)]}`;
}

type ModalState =
  | { mode: "view"; slot: ScheduleSlot; occurrenceDate: string }
  | { mode: "add"; date: string; hour: string }
  | { mode: "edit"; slot: ScheduleSlot }
  | { mode: "exception"; slot: ScheduleSlot; occurrenceDate: string }
  | null;

export default function SchedulePage() {
  const [tab, setTab] = useState<"weekly" | "calendar">("weekly");
  const { data: slots = [], isLoading } = useSchedule();
  const { data: groups = [] } = useGroups();
  const { data: allTeachers = [] } = useTeachers();
  const { data: exceptions = [] } = useScheduleExceptions();
  const createSlot = useCreateScheduleSlot();
  const updateSlot = useUpdateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();
  const createException = useCreateScheduleException();
  const deleteException = useDeleteScheduleException();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [modal, setModal] = useState<ModalState>(null);
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const teachers = useMemo(
    () => [...new Set(slots.map((s) => s.teacherName).filter(Boolean) as string[])],
    [slots]
  );

  const holidays = useMemo(
    () => exceptions.filter((e) => e.kind === "holiday").sort((a, b) => a.date.localeCompare(b.date)),
    [exceptions]
  );

  // Guruh darslari uchun statistika — haftalik takrorlanuvchi shablonga asoslanadi
  // (qaysi hafta ko'rsatilayotganidan qat'i nazar bir xil qoladi).
  const totalLessons = slots.length;
  const totalHours = Number(
    (slots.reduce((sum, s) => sum + (s.durationMinutes ?? 90), 0) / 60).toFixed(1)
  );
  const activeGroups = new Set(slots.map((s) => s.groupId)).size;
  const emptySlots = HOURS.length * 7 - totalLessons;

  function openAdd(date: string, hour: string) {
    setModal({ mode: "add", date, hour });
  }
  function openView(slot: ScheduleSlot, occurrenceDate: string) {
    setModal({ mode: "view", slot, occurrenceDate });
  }

  async function handleCreate(form: CreateSlotPayload) {
    setModalError(null);
    try {
      await createSlot.mutateAsync(form);
      setModal(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      setModalError(msg?.message ?? msg?.error ?? "Xatolik yuz berdi");
    }
  }

  async function handleUpdate(id: string, patch: Partial<CreateSlotPayload>) {
    setModalError(null);
    try {
      await updateSlot.mutateAsync({ id, ...patch });
      setModal(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      setModalError(msg?.message ?? msg?.error ?? "Xatolik yuz berdi");
    }
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Dars vaqtlari
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
            {(["weekly", "calendar"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                  background: tab === t ? "var(--surface)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text-faint)",
                  boxShadow: tab === t ? "var(--shadow-xs)" : "none",
                }}>
                {t === "weekly" ? "Haftalik" : "Kalendar"}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => openAdd(toDateStr(new Date()), "09:00")}>
            <Icon name="plus" size={15} /> Dars qo'shish
          </button>
        </div>
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

      {tab === "weekly" ? (
        <WeeklyView teacherFilter={teacherFilter} onOpenAdd={openAdd} onOpenView={openView} />
      ) : (
        <CalendarView teacherFilter={teacherFilter} onOpenAdd={openAdd} onOpenView={openView} />
      )}

      {/* Stats */}
      <div className="grid cols-4">
        <StatCard icon="calendar" tone="i" value={String(totalLessons)} label="Haftalik darslar" />
        <StatCard icon="clock" tone="i" value={`${totalHours} soat`} label="Dars vaqtlari" />
        <StatCard icon="groups" tone="s" value={`${activeGroups} guruh`} label="Faol guruhlar" />
        <StatCard icon="alert" tone="d" value={String(emptySlots)} label="Bo'sh vaqtlar"
          delta={<span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>qizil = bo'sh</span>}
        />
      </div>

      {/* Dam olish kunlari (bayramlar) */}
      <Card style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: holidays.length ? 14 : 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Dam olish kunlari</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
              Belgilangan kunda hech kimda dars ko'rinmaydi
            </div>
          </div>
          <HolidayAddButton onAdd={(date, reason) => createHoliday.mutate({ date, reason })} isPending={createHoliday.isPending} />
        </div>
        {holidays.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {holidays.map((h) => (
              <div key={h.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--surface-2)", borderRadius: 8, padding: "6px 10px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(h.date)}</span>
                {h.reason && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>· {h.reason}</span>}
                <button
                  onClick={() => deleteHoliday.mutate(h.id)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-faint)", display: "flex" }}
                  title="O'chirish"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      {modal && (
        <ModalOverlay onClose={() => { setModal(null); setModalError(null); }}>
          {modal.mode === "view" && (
            <ViewModal
              slot={modal.slot}
              onClose={() => setModal(null)}
              onEdit={() => setModal({ mode: "edit", slot: modal.slot })}
              onDelete={() => handleDelete(modal.slot.id)}
              onException={() => setModal({ mode: "exception", slot: modal.slot, occurrenceDate: modal.occurrenceDate })}
              isDeleting={deleteSlot.isPending}
            />
          )}
          {modal.mode === "exception" && (
            <ExceptionModal
              slot={modal.slot}
              occurrenceDate={modal.occurrenceDate}
              existing={exceptions.filter((e) => e.scheduleSlotId === modal.slot.id)}
              onClose={() => setModal(null)}
              onCancel={(date, reason) =>
                createException.mutateAsync({ scheduleSlotId: modal.slot.id, date, kind: "cancelled", reason })
                  .then(() => setModal(null))
              }
              onReschedule={(date, newDate, newStartTime, reason) =>
                createException.mutateAsync({
                  scheduleSlotId: modal.slot.id, date, kind: "rescheduled", newDate, newStartTime, reason,
                }).then(() => setModal(null))
              }
              onDeleteExisting={(id) => deleteException.mutate(id)}
              isPending={createException.isPending}
            />
          )}
          {modal.mode === "add" && (
            <AddModal
              date={modal.date}
              hour={modal.hour}
              groups={groups}
              teachers={allTeachers}
              onClose={() => { setModal(null); setModalError(null); }}
              onCreate={handleCreate}
              isPending={createSlot.isPending}
              error={modalError}
            />
          )}
          {modal.mode === "edit" && (
            <EditModal
              slot={modal.slot}
              teachers={allTeachers}
              onClose={() => { setModal(null); setModalError(null); }}
              onSave={handleUpdate}
              isPending={updateSlot.isPending}
              error={modalError}
            />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

/* ══════════════════════════ Haftalik ko'rinish ══════════════════════════ */

function WeeklyView({ teacherFilter, onOpenAdd, onOpenView }: {
  teacherFilter: string | null;
  onOpenAdd: (date: string, hour: string) => void;
  onOpenView: (slot: ScheduleSlot, occurrenceDate: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekEnd = addDays(weekStart, 6);
  const from = toDateStr(weekStart);
  const to = toDateStr(weekEnd);
  const { data: days = [], isLoading } = useScheduleOccurrences(from, to);
  const todayStr = toDateStr(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleOccurrenceSlot[]>();
    for (const d of days) {
      const list = teacherFilter ? d.slots.filter((s) => s.teacherName === teacherFilter) : d.slots;
      map.set(d.date, list);
    }
    return map;
  }, [days, teacherFilter]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dim)" }}>
          {fmtDisplayDate(from)} — {fmtDisplayDate(to)}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={() => setWeekStart(mondayOf(new Date()))}>Bugun</button>
          <button className="iconbtn" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button className="iconbtn" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      <Card style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={thTime}>Vaqt</th>
                {weekDates.map((d, di) => {
                  const dateStr = toDateStr(d);
                  const isToday = dateStr === todayStr;
                  return (
                    <th key={di} style={{ ...thDay, color: isToday ? "var(--accent)" : "var(--text)" }}>
                      {DAY_SHORT[di]} <span style={{ opacity: 0.6 }}>{d.getDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: 30, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</td></tr>
              ) : HOURS.map((hour) => (
                <tr key={hour}>
                  <td style={tdTime}>{hour}</td>
                  {weekDates.map((d, di) => {
                    const dateStr = toDateStr(d);
                    const cellSlots = (byDate.get(dateStr) ?? []).filter((s) => String(s.startTime).slice(0, 5) === hour);
                    return (
                      <td key={di} style={tdCell}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {cellSlots.map((s) => (
                            <LessonCard
                              key={`${s.id}-${s.occurrenceDate}`}
                              slot={s}
                              onClick={() => onOpenView(s, s.occurrenceDate)}
                            />
                          ))}
                          {cellSlots.length === 0 ? (
                            <EmptyCell onClick={() => onOpenAdd(dateStr, hour)} />
                          ) : (
                            <AddMoreButton onClick={() => onOpenAdd(dateStr, hour)} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ══════════════════════════ Kalendar ko'rinish ══════════════════════════ */

function CalendarView({ teacherFilter, onOpenAdd, onOpenView }: {
  teacherFilter: string | null;
  onOpenAdd: (date: string, hour: string) => void;
  onOpenView: (slot: ScheduleSlot, occurrenceDate: string) => void;
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = mondayOf(monthStart);
  const weeks = useMemo(
    () => Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d))),
    [gridStart]
  );
  const from = toDateStr(gridStart);
  const to = toDateStr(addDays(gridStart, 41));
  const { data: days = [], isLoading } = useScheduleOccurrences(from, to);
  const todayStr = toDateStr(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleOccurrenceSlot[]>();
    for (const d of days) {
      const list = teacherFilter ? d.slots.filter((s) => s.teacherName === teacherFilter) : d.slots;
      map.set(d.date, list);
    }
    return map;
  }, [days, teacherFilter]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          {MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={() => setMonthAnchor(new Date())}>Bugun</button>
          <button className="iconbtn" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button className="iconbtn" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      <Card style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860, tableLayout: "fixed" }}>
            <thead>
              <tr>
                {DAY_SHORT.map((d) => <th key={d} style={thDay}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: "var(--text-faint)" }}>Yuklanmoqda...</td></tr>
              ) : weeks.map((row, wi) => (
                <tr key={wi}>
                  {row.map((date) => {
                    const dateStr = toDateStr(date);
                    const inMonth = date.getMonth() === monthAnchor.getMonth();
                    const slots = byDate.get(dateStr) ?? [];
                    return (
                      <DayCell
                        key={dateStr}
                        date={date}
                        dateStr={dateStr}
                        inMonth={inMonth}
                        isToday={dateStr === todayStr}
                        slots={slots}
                        onAdd={() => onOpenAdd(dateStr, "09:00")}
                        onOpenChip={(s) => onOpenView(s, s.occurrenceDate)}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function DayCell({ date, dateStr, inMonth, isToday, slots, onAdd, onOpenChip }: {
  date: Date; dateStr: string; inMonth: boolean; isToday: boolean;
  slots: ScheduleOccurrenceSlot[];
  onAdd: () => void;
  onOpenChip: (s: ScheduleOccurrenceSlot) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...slots].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  const visible = expanded ? sorted : sorted.slice(0, 3);
  const overflow = sorted.length - visible.length;

  return (
    <td style={dayCellStyle}>
      <div style={{ opacity: inMonth ? 1 : 0.4, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{
            fontSize: 12, fontWeight: 800, width: 20, height: 20, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isToday ? "var(--accent)" : "transparent",
            color: isToday ? "#fff" : "var(--text)",
          }}>
            {date.getDate()}
          </span>
          <button onClick={onAdd} title="Dars qo'shish" style={{
            border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)",
            fontSize: 13, fontWeight: 800, padding: 0, lineHeight: 1,
          }}>
            +
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visible.map((s) => (
            <CalendarChip key={`${s.id}-${s.occurrenceDate}`} slot={s} onClick={() => onOpenChip(s)} />
          ))}
          {overflow > 0 && (
            <button onClick={() => setExpanded(true)} style={{
              border: "none", background: "transparent", cursor: "pointer",
              fontSize: 10, color: "var(--text-faint)", fontWeight: 700, textAlign: "left", padding: "1px 4px",
            }}>
              +{overflow} ko'proq
            </button>
          )}
        </div>
      </div>
    </td>
  );
}

function CalendarChip({ slot, onClick }: { slot: ScheduleOccurrenceSlot; onClick: () => void }) {
  const cancelled = slot.exceptionKind === "cancelled";
  const color = slot.color ?? "#3F8CFF";
  const name = slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—");
  return (
    <div
      onClick={onClick}
      title={`${String(slot.startTime).slice(0, 5)} ${name}`}
      style={{
        fontSize: 10.5, padding: "2px 6px", borderRadius: 4, cursor: "pointer",
        background: cancelled ? "var(--surface-3)" : `${color}22`,
        color: cancelled ? "var(--text-faint)" : color,
        textDecoration: cancelled ? "line-through" : "none",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        fontWeight: 700,
      }}
    >
      {String(slot.startTime).slice(0, 5)} {name}
    </div>
  );
}

/* ─── Modal overlay ─── */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>,
    document.body
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
function ViewModal({ slot, onClose, onEdit, onDelete, onException, isDeleting }: {
  slot: ScheduleSlot; onClose: () => void; onEdit: () => void;
  onDelete: () => void; onException: () => void; isDeleting: boolean;
}) {
  const color = slot.color ?? "#3F8CFF";

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
          slot.specificDate
            ? { label: "Sana", value: `${fmtDate(slot.specificDate)} (bir martalik)` }
            : { label: "Hafta kuni", value: DAY_FULL[slot.dayOfWeek] },
          { label: "Xona", value: slot.roomName ?? "—" },
          { label: "Platforma", value: slot.meetingPlatform === "meet" ? "Google Meet" : "Zoom" },
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

      {!slot.specificDate && (
        <button className="btn" style={{ width: "100%", marginTop: 16, marginBottom: 12 }} onClick={onException}>
          <Icon name="calendar" size={14} /> Bitta safar bekor qilish / ko'chirish
        </button>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: slot.specificDate ? 16 : 0 }}>
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
function AddModal({ date, hour, groups, teachers, onClose, onCreate, isPending, error }: {
  date: string; hour: string;
  groups: { id: string; name: string }[];
  teachers: Teacher[];
  onClose: () => void;
  onCreate: (f: CreateSlotPayload) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const [lessonType, setLessonType] = useState<"guruh" | "individual" | "diagnostika">("guruh");
  const [form, setForm] = useState({
    groupId: groups[0]?.id ?? "",
    teacherId: "",
    customName: "",
    day: String(dayOfWeekOf(new Date(date + "T00:00:00"))),
    date,
    time: hour,
    duration: 90,
    meetingPlatform: "zoom" as "zoom" | "meet",
    meetingUrl: "",
  });

  const isGroupMode = lessonType === "guruh";
  const canSubmit = isGroupMode
    ? !!form.groupId
    : !!form.customName.trim() && !!form.date;

  return (
    <ModalBox>
      <ModalHeader title="Dars qo'shish" onClose={onClose} />

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
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
            {isGroupMode ? "Har hafta shu kunda takrorlanadi" : "Faqat tanlangan sanada — bir martalik"}
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
          <>
            <div>
              <label style={labelStyle}>DARS NOMI</label>
              <input className="inp" style={{ width: "100%" }}
                placeholder={lessonType === "individual" ? "Masalan: Ali bilan individual dars" : "Masalan: Yangi o'quvchi diagnostikasi"}
                value={form.customName}
                onChange={(e) => setForm({ ...form, customName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>O'QITUVCHI</label>
              <select className="inp" style={{ width: "100%" }} value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">O'qituvchisiz</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Day/date & time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {isGroupMode ? (
            <div>
              <label style={labelStyle}>HAFTA KUNI</label>
              <select className="inp" style={{ width: "100%" }} value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {DAY_FULL.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>SANA</label>
              <input className="inp" type="date" style={{ width: "100%" }} value={form.date}
                min={toDateStr(new Date())}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          )}
          <div>
            <label style={labelStyle}>VAQT</label>
            <select className="inp" style={{ width: "100%" }} value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label style={labelStyle}>DAVOMIYLIK (daqiqa)</label>
          <input className="inp" type="number" min={15} max={480} step={15} style={{ width: "100%" }}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
        </div>

        {/* Platform */}
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

        {/* Meeting URL */}
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
      </div>

      {error && (
        <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginTop: 14 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button className="btn primary" style={{ flex: 2 }}
          disabled={!canSubmit || isPending}
          onClick={() => onCreate({
            lessonType,
            groupId: isGroupMode ? form.groupId : undefined,
            teacherId: isGroupMode ? undefined : (form.teacherId || undefined),
            customName: isGroupMode ? undefined : form.customName.trim(),
            dayOfWeek: isGroupMode ? Number(form.day) : dayOfWeekOf(new Date(form.date + "T00:00:00")),
            specificDate: isGroupMode ? null : form.date,
            startTime: form.time,
            durationMinutes: form.duration,
            isOnline: true,
            meetingPlatform: form.meetingPlatform,
            meetingUrl: form.meetingUrl || undefined,
          })}>
          <Icon name="check" size={14} /> {isPending ? "Saqlanmoqda..." : "Qo'shish"}
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Edit modal ─── */
function EditModal({ slot, teachers, onClose, onSave, isPending, error }: {
  slot: ScheduleSlot; teachers: Teacher[]; onClose: () => void;
  onSave: (id: string, patch: Partial<CreateSlotPayload>) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const [form, setForm] = useState({
    lessonType: (slot.lessonType ?? "guruh") as "guruh" | "individual" | "diagnostika",
    customName: slot.customName ?? "",
    teacherId: slot.teacherId ?? "",
    day: String(slot.dayOfWeek),
    date: fmtDate(slot.specificDate) || toDateStr(new Date()),
    time: String(slot.startTime).slice(0, 5),
    duration: slot.durationMinutes ?? 90,
    meetingPlatform: (slot.meetingPlatform ?? "zoom") as "zoom" | "meet",
    meetingUrl: slot.meetingUrl ?? "",
  });

  const color = slot.color ?? "#3F8CFF";
  const displayName = slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—");
  const isGroupMode = form.lessonType === "guruh";

  return (
    <ModalBox>
      <ModalHeader title="Darsni tahrirlash" onClose={onClose} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `${color}22`, display: "grid", placeItems: "center", fontSize: 20,
        }}>♟</div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{displayName}</div>
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
        {!isGroupMode && (
          <>
            <div>
              <label style={labelStyle}>DARS NOMI</label>
              <input className="inp" style={{ width: "100%" }}
                placeholder="Dars nomini kiriting..."
                value={form.customName}
                onChange={(e) => setForm({ ...form, customName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>O'QITUVCHI</label>
              <select className="inp" style={{ width: "100%" }} value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">O'qituvchisiz</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </div>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {isGroupMode ? (
            <div>
              <label style={labelStyle}>HAFTA KUNI</label>
              <select className="inp" style={{ width: "100%" }} value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {DAY_FULL.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>SANA</label>
              <input className="inp" type="date" style={{ width: "100%" }} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          )}
          <div>
            <label style={labelStyle}>VAQT</label>
            <input className="inp" type="time" style={{ width: "100%" }} value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>DAVOMIYLIK (daqiqa)</label>
          <input className="inp" type="number" min={15} max={480} step={15} style={{ width: "100%" }}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
        </div>

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
      </div>

      {error && (
        <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginTop: 14 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button className="btn primary" style={{ flex: 2 }} disabled={isPending}
          onClick={() => onSave(slot.id, {
            lessonType: form.lessonType,
            customName: !isGroupMode ? form.customName.trim() : undefined,
            teacherId: !isGroupMode ? (form.teacherId || undefined) : undefined,
            dayOfWeek: isGroupMode ? Number(form.day) : dayOfWeekOf(new Date(form.date + "T00:00:00")),
            specificDate: isGroupMode ? null : form.date,
            startTime: form.time,
            durationMinutes: form.duration,
            isOnline: true,
            meetingPlatform: form.meetingPlatform,
            meetingUrl: form.meetingUrl || undefined,
          })}>
          <Icon name="check" size={14} /> {isPending ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Exception modal (bitta darsni bekor qilish / ko'chirish) ─── */
function ExceptionModal({ slot, occurrenceDate, existing, onClose, onCancel, onReschedule, onDeleteExisting, isPending }: {
  slot: ScheduleSlot;
  occurrenceDate: string;
  existing: ScheduleException[];
  onClose: () => void;
  onCancel: (date: string, reason?: string) => Promise<unknown>;
  onReschedule: (date: string, newDate: string, newStartTime: string, reason?: string) => Promise<unknown>;
  onDeleteExisting: (id: string) => void;
  isPending: boolean;
}) {
  const [action, setAction] = useState<"cancelled" | "rescheduled">("cancelled");
  const [newDate, setNewDate] = useState(occurrenceDate);
  const [newTime, setNewTime] = useState(String(slot.startTime).slice(0, 5));
  const [reason, setReason] = useState("");
  const displayName = slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—");

  return (
    <ModalBox>
      <ModalHeader title={`${displayName} — bitta safar`} onClose={onClose} />

      {existing.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>MAVJUD ISTISNOLAR</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {existing.map((e) => (
              <div key={e.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--surface-2)", borderRadius: 8, padding: "8px 10px",
              }}>
                <span style={{ fontSize: 13 }}>
                  {fmtDate(e.date)} — {e.kind === "cancelled" ? "bekor qilingan" : `${fmtDate(e.newDate)} ${e.newStartTime?.slice(0, 5)} ga ko'chirilgan`}
                </span>
                <button onClick={() => onDeleteExisting(e.id)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-faint)", display: "flex" }}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>AMAL</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["cancelled", "rescheduled"] as const).map((a) => (
              <button key={a} onClick={() => setAction(a)}
                style={{
                  flex: 1, padding: "9px 4px", borderRadius: 8, cursor: "pointer",
                  border: action === a ? "none" : "1px solid var(--border)",
                  background: action === a ? "var(--accent)" : "var(--surface-2)",
                  color: action === a ? "#fff" : "var(--text-dim)",
                  fontWeight: 700, fontSize: 12,
                }}>
                {a === "cancelled" ? "Bekor qilish" : "Ko'chirish"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
            {action === "cancelled"
              ? `Faqat ${fmtDisplayDate(occurrenceDate)} kungi darsni bekor qiladi — haftalik jadval o'zgarmaydi, keyingi safar dars odatdagidek bo'ladi.`
              : `Faqat ${fmtDisplayDate(occurrenceDate)} kungi darsni boshqa sana/vaqtga ko'chiradi — haftalik jadval o'zgarmaydi, bu bir martalik ko'chirish.`}
          </div>
        </div>

        {action === "rescheduled" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>YANGI SANA</label>
              <input className="inp" type="date" style={{ width: "100%" }} value={newDate}
                onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>YANGI VAQT</label>
              <input className="inp" type="time" style={{ width: "100%" }} value={newTime}
                onChange={(e) => setNewTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>SABAB (ixtiyoriy)</label>
          <input className="inp" style={{ width: "100%" }} value={reason}
            onChange={(e) => setReason(e.target.value)} placeholder="Masalan: o'qituvchi kasal" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Bekor</button>
        <button className="btn primary" style={{ flex: 2 }} disabled={isPending}
          onClick={() => action === "cancelled"
            ? onCancel(occurrenceDate, reason || undefined)
            : onReschedule(occurrenceDate, newDate, newTime, reason || undefined)}>
          <Icon name="check" size={14} /> {isPending ? "Saqlanmoqda..." : "Tasdiqlash"}
        </button>
      </div>
    </ModalBox>
  );
}

/* ─── Holiday quick-add ─── */
function HolidayAddButton({ onAdd, isPending }: { onAdd: (date: string, reason?: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toDateStr(new Date()));
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} /> Qo'shish
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input className="inp" style={{ width: 140 }} placeholder="Sabab" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button className="btn primary" disabled={isPending}
        onClick={() => { onAdd(date, reason || undefined); setOpen(false); setReason(""); }}>
        {isPending ? "..." : "Saqlash"}
      </button>
      <button className="btn" onClick={() => setOpen(false)}>Bekor</button>
    </div>
  );
}

/* ─── Lesson card cell (haftalik ko'rinish) ─── */
function LessonCard({ slot, onClick }: { slot: ScheduleOccurrenceSlot; onClick: () => void }) {
  const color = slot.color ?? "#3F8CFF";
  const cancelled = slot.exceptionKind === "cancelled";
  const rescheduled = slot.exceptionKind === "rescheduled";
  const hasException = cancelled || rescheduled;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 8, padding: "7px 10px",
        borderLeft: `3px solid ${hasException ? "#ef4444" : color}`,
        background: hasException ? "color-mix(in oklab, #ef4444 8%, var(--surface))" : `${color}1a`,
        opacity: cancelled ? 0.7 : 1,
        height: "100%", boxSizing: "border-box",
        cursor: "pointer", transition: "filter .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        <div style={{
          fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, color: "var(--text)",
          textDecoration: cancelled ? "line-through" : "none",
        }}>
          {slot.lessonType !== "guruh" ? (slot.customName ?? "—") : (slot.groupName ?? "—")}
        </div>
        {slot.specificDate && (
          <span title="Bir martalik dars" style={{
            fontSize: 9, fontWeight: 800, color: "#8b5cf6", background: "#8b5cf61a",
            padding: "1px 5px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap",
          }}>
            1×
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, marginTop: 3, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {slot.lessonType !== "guruh" && (
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>
            {slot.lessonType === "individual" ? "ind." : "diag."}
          </span>
        )}
        <span style={{ color, fontWeight: 700 }}>
          {slot.meetingPlatform === "meet" ? "meet" : "zoom"}
        </span>
        {slot.teacherName && (
          <span style={{ color: "var(--text-faint)" }}>
            {slot.teacherName.split(" ").slice(0, 2).map((w, i) => i === 0 ? w : w[0] + ".").join(" ")}
          </span>
        )}
      </div>
      {cancelled && (
        <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginTop: 3 }}>
          ⊘ bekor qilindi
        </div>
      )}
      {rescheduled && (
        <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginTop: 3 }}>
          → ko'chirilgan
        </div>
      )}
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

/* ─── Add another lesson into an occupied cell ─── */
function AddMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Yana dars qo'shish"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 20, borderRadius: 6, border: "1px dashed var(--border)",
        background: "transparent", color: "var(--text-faint)",
        fontSize: 13, cursor: "pointer", fontWeight: 700, padding: 0,
      }}
    >
      +
    </button>
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
  padding: 4, minHeight: 60,
  borderBottom: "1px solid var(--border)",
  borderLeft: "1px solid var(--border)",
  verticalAlign: "top",
};
const dayCellStyle: React.CSSProperties = {
  padding: 6, height: 100, minWidth: 110,
  borderBottom: "1px solid var(--border)",
  borderLeft: "1px solid var(--border)",
  verticalAlign: "top",
};
