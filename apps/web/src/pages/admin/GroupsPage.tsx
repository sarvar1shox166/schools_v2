import { useState } from "react";
import { Card, Icon, PageHead, Segmented } from "@chess-school/ui";
import { useCreateGroup, useDeleteGroup, useGroups, useTeachers } from "../../lib/queries.js";

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const { data: teachers } = useTeachers();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", level: "", teacherId: "", color: "#6366f1", capacity: "12" });

  async function handleCreate() {
    await createGroup.mutateAsync({
      name: form.name,
      level: form.level || undefined,
      teacherId: form.teacherId || undefined,
      color: form.color,
      capacity: Number(form.capacity) || 12,
    });
    setForm({ name: "", level: "", teacherId: "", color: "#6366f1", capacity: "12" });
    setShowForm(false);
  }

  return (
    <div>
      <PageHead title={`Guruhlar — ${groups?.length ?? 0} ta`}>
        <Segmented
          value={view}
          onChange={setView}
          options={[{ v: "grid", label: "Kartochka" }, { v: "list", label: "Ro'yxat" }]}
        />
        <button className="btn sm primary" onClick={() => setShowForm((v) => !v)}>
          <Icon name="plus" size={15} /> Guruh qo'shish
        </button>
      </PageHead>

      {showForm && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <input className="inp" placeholder="Guruh nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="inp" placeholder="Daraja" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
            <select className="inp" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">O'qituvchi tanlang</option>
              {teachers?.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
            <input className="inp" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input className="inp" placeholder="Sig'im" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <button className="btn sm primary" style={{ marginTop: 12 }} onClick={handleCreate} disabled={!form.name}>
            Saqlash
          </button>
        </Card>
      )}

      {isLoading && <div>Yuklanmoqda...</div>}

      {view === "grid" ? (
        <div className="grid cols-3">
          {groups?.map((g) => (
            <Card key={g.id} className="card-pad fade-up">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: g.color ?? "#6366f1" }} />
                  {g.name}
                </div>
                <div className="menu-wrap">
                  <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setOpenMenu(openMenu === g.id ? null : g.id)}>
                    <Icon name="dotsV" size={15} />
                  </button>
                  {openMenu === g.id && (
                    <div className="menu-pop">
                      <button onClick={() => setOpenMenu(null)}>
                        <Icon name="edit" size={14} /> Tahrirlash
                      </button>
                      <button className="danger" onClick={() => { deleteGroup.mutate(g.id); setOpenMenu(null); }}>
                        <Icon name="trash" size={14} /> O'chirish
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 10 }}>
                {g.level} {g.teacherName ? `· ${g.teacherName}` : ""} {g.roomName ? `· ${g.roomName}` : ""}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                <span style={{ fontWeight: 650 }}>O'quvchilar</span>
                <span className="tnum" style={{ color: "var(--text-faint)", fontWeight: 700 }}>{g.studentsCount}/{g.capacity}</span>
              </div>
              <div className="pbar"><span style={{ width: `${Math.min(100, (g.studentsCount / g.capacity) * 100)}%`, background: g.color ?? "#6366f1" }} /></div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <a className="btn sm" style={{ flex: 1 }} href={`/admin/students?groupId=${g.id}`}>
                  <Icon name="students" size={14} /> O'quvchilar
                </a>
                <a className="btn sm" style={{ flex: 1 }} href={`/admin/schedule?groupId=${g.id}`}>
                  <Icon name="calendar" size={14} /> Jadval
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="fade-up">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Guruh</th><th>O'qituvchi</th><th>Xona</th><th>To'ldirilganlik</th><th></th></tr></thead>
              <tbody>
                {groups?.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="with-av">
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: g.color ?? "#6366f1", color: "#fff",
                          display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {g.name.slice(0, 1)}
                        </div>
                        <div><div className="cell-main">{g.name}</div><div className="cell-sub">{g.level}</div></div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{g.teacherName ?? "-"}</td>
                    <td><span className="badge neut">{g.roomName ?? "-"}</span></td>
                    <td style={{ minWidth: 170 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="pbar" style={{ flex: 1 }}><span style={{ width: `${Math.min(100, (g.studentsCount / g.capacity) * 100)}%`, background: g.color ?? "#6366f1" }} /></div>
                        <span className="tnum cell-sub" style={{ fontWeight: 700, minWidth: 36 }}>{g.studentsCount}/{g.capacity}</span>
                      </div>
                    </td>
                    <td>
                      <div className="menu-wrap">
                        <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setOpenMenu(openMenu === g.id ? null : g.id)}>
                          <Icon name="dotsV" size={15} />
                        </button>
                        {openMenu === g.id && (
                          <div className="menu-pop">
                            <button onClick={() => setOpenMenu(null)}>
                              <Icon name="edit" size={14} /> Tahrirlash
                            </button>
                            <button className="danger" onClick={() => { deleteGroup.mutate(g.id); setOpenMenu(null); }}>
                              <Icon name="trash" size={14} /> O'chirish
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
