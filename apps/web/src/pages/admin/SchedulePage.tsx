import { useMemo, useState } from "react";
import { Card, Icon, PageHead, Segmented, StatCard } from "@chess-school/ui";
import { useCreateScheduleSlot, useGroups, useSchedule } from "../../lib/queries.js";

const DAYS = ["Du", "Se", "Chor", "Pay", "Ju", "Sha", "Yak"];

export default function SchedulePage() {
  const { data: slots, isLoading } = useSchedule();
  const { data: groups } = useGroups();
  const createSlot = useCreateScheduleSlot();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ groupId: "", dayOfWeek: "0", startTime: "09:00", isOnline: false });
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const kpis = useMemo(() => {
    const totalLessons = slots?.length ?? 0;
    const totalHours = totalLessons; // each slot ≈ 1 teaching hour
    const activeRooms = new Set((slots ?? []).map((s) => s.roomId).filter(Boolean)).size;
    return { totalLessons, totalHours, activeRooms };
  }, [slots]);

  const times = useMemo(() => {
    const set = new Set<string>(slots?.map((s) => s.startTime.slice(0, 5)) ?? []);
    ["09:00", "11:00", "14:00", "16:00", "18:00"].forEach((t) => set.add(t));
    return [...set].sort();
  }, [slots]);

  const grid = useMemo(() => {
    const map = new Map<string, typeof slots>();
    for (const time of times) {
      for (let d = 0; d < 7; d++) map.set(`${time}-${d}`, []);
    }
    for (const s of slots ?? []) {
      const key = `${s.startTime.slice(0, 5)}-${s.dayOfWeek}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots, times]);

  async function handleCreate() {
    await createSlot.mutateAsync({
      groupId: form.groupId,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      isOnline: form.isOnline,
    });
    setShowForm(false);
  }

  return (
    <div>
      <PageHead title="Haftalik dars jadvali">
        <button className="btn sm primary" onClick={() => setShowForm((v) => !v)}>
          <Icon name="plus" size={15} /> Dars qo'shish
        </button>
      </PageHead>

      {showForm && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <select className="inp" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Guruh tanlang</option>
              {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select className="inp" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            <input className="inp" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={form.isOnline}
              onChange={(e) => setForm({ ...form, isOnline: e.target.checked })}
            />
            Onlayn dars (video qo'ng'iroq havolasi avtomatik yaratiladi)
          </label>
          <button className="btn sm primary" style={{ marginTop: 12 }} onClick={handleCreate} disabled={!form.groupId}>
            Saqlash
          </button>
        </Card>
      )}

      <div style={{ marginBottom: "var(--gap)" }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { v: "day", label: "Kun" },
            { v: "week", label: "Hafta" },
            { v: "month", label: "Oy" },
          ]}
        />
      </div>

      {isLoading && <div>Yuklanmoqda...</div>}

      {view !== "week" && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div className="empty">
            {view === "day" ? "Kunlik ko'rinish tez kunda qo'shiladi" : "Oylik ko'rinish tez kunda qo'shiladi"}
          </div>
        </Card>
      )}

      {view === "week" && (
      <Card className="card-pad fade-up">
        <div className="sched">
          <div className="hcell">Vaqt</div>
          {DAYS.map((d) => <div className="hcell" key={d}>{d}</div>)}
          {times.map((time) => (
            <div key={time} style={{ display: "contents" }}>
              <div className="tcell">{time}</div>
              {DAYS.map((_, di) => {
                const cellSlots = grid.get(`${time}-${di}`) ?? [];
                return (
                  <div className="cell" key={di}>
                    {cellSlots.map((s) => (
                      <div className="lesson-blk" key={s!.id} style={{ borderLeftColor: s!.color ?? undefined }}>
                        <b>{s!.groupName}</b>{s!.isOnline && <Icon name="zap" size={11} />}
                        <span>{s!.teacherName ?? ""}{s!.roomName ? ` · ${s!.roomName}` : ""}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
      )}

      <div className="kpi-grid" style={{ marginTop: "var(--gap)" }}>
        <StatCard icon="calendar" value={kpis.totalLessons} label="Haftalik darslar soni" />
        <StatCard icon="clock" value={`${kpis.totalHours} soat`} label="Umumiy o'qitish yuklamasi" />
        <StatCard icon="layers" value={kpis.activeRooms} label="Faol xonalar" />
      </div>
    </div>
  );
}
