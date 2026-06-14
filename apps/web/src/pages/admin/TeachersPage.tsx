import { useState } from "react";
import { Avatar, Card, Icon, PageHead } from "@chess-school/ui";
import { useCreateTeacher, useDeleteTeacher, useTeachers } from "../../lib/queries.js";

export default function TeachersPage() {
  const { data: teachers, isLoading } = useTeachers();
  const createTeacher = useCreateTeacher();
  const deleteTeacher = useDeleteTeacher();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", spec: "", title: "", expYears: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleCreate() {
    const res = await createTeacher.mutateAsync({
      fullName: form.fullName,
      phone: form.phone,
      spec: form.spec || undefined,
      title: form.title || undefined,
      expYears: form.expYears ? Number(form.expYears) : undefined,
    });
    setTempPassword(res.tempPassword);
    setForm({ fullName: "", phone: "", spec: "", title: "", expYears: "" });
  }

  return (
    <div>
      <PageHead title={`O'qituvchilar — ${teachers?.length ?? 0} ta`}>
        <button className="btn sm primary" onClick={() => setShowForm((v) => !v)}>
          <Icon name="plus" size={15} /> O'qituvchi qo'shish
        </button>
      </PageHead>

      {showForm && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <input className="inp" placeholder="F.I.Sh" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="inp" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="inp" placeholder="Yo'nalish" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
            <input className="inp" placeholder="Unvon" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="inp" placeholder="Tajriba (yil)" value={form.expYears} onChange={(e) => setForm({ ...form, expYears: e.target.value })} />
          </div>
          <button className="btn sm primary" style={{ marginTop: 12 }} onClick={handleCreate} disabled={!form.fullName || !form.phone}>
            Saqlash
          </button>
          {tempPassword && (
            <div className="badge suc" style={{ marginTop: 10 }}>
              Vaqtinchalik parol: <b>{tempPassword}</b>
            </div>
          )}
        </Card>
      )}

      {isLoading && <div>Yuklanmoqda...</div>}

      <div className="grid cols-3">
        {teachers?.map((t) => (
          <Card key={t.id} className="card-pad fade-up">
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Avatar name={t.fullName} size="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 750, fontSize: 15.5 }}>{t.fullName}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{t.spec}</div>
                {t.title && <span className="badge acc" style={{ marginTop: 9 }}><Icon name="award" size={12} /> {t.title}</span>}
              </div>
              <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => deleteTeacher.mutate(t.id)}>
                <Icon name="trash" size={16} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <Stat icon="groups" v={t.groupsCount} l="Guruh" />
              <Stat icon="clock" v={t.expYears ?? "-"} l="Tajriba" />
              <RatingStat rating={t.rating} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a className="btn sm" style={{ flex: 1 }} href={`tel:${t.phone}`}>
                <Icon name="phone" size={14} /> Aloqa
              </a>
              <a className="btn sm" style={{ flex: 1 }} href={`/admin/schedule?teacherId=${t.id}`}>
                <Icon name="calendar" size={14} /> Jadval
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RatingStat({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div className="stars" style={{ justifyContent: "center", fontSize: 13 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="star" size={14} className={i < full ? "" : "empty"} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{rating.toFixed(1)} reyting</div>
    </div>
  );
}

function Stat({ icon, v, l }: { icon: string; v: string | number; l: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontWeight: 750, fontSize: 13 }}>
        <Icon name={icon} size={15} style={{ color: "var(--accent-text)" }} /> {v}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{l}</div>
    </div>
  );
}
