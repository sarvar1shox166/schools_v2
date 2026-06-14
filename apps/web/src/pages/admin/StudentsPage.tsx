import { useMemo, useState } from "react";
import { Avatar, Card, Icon, PageHead, Segmented, StatusBadge } from "@chess-school/ui";
import { useCreateStudent, useDeleteStudent, useGroups, useStudentPackages, useStudents } from "../../lib/queries.js";

const PAGE_SIZE = 10;

export default function StudentsPage() {
  const { data: students, isLoading } = useStudents();
  const { data: groups } = useGroups();
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();

  const [filter, setFilter] = useState("hammasi");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [levelFilter, setLevelFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ fullName: "", phone: "", level: "", age: "", groupId: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const tabs = [
    { v: "hammasi", label: "Hammasi" },
    { v: "faol", label: "Faol" },
    { v: "yangi", label: "Yangi" },
    { v: "nofaol", label: "Nofaol" },
  ];

  const levels = useMemo(
    () => Array.from(new Set((students ?? []).map((s) => s.level).filter(Boolean))) as string[],
    [students]
  );

  let rows = students ?? [];
  if (filter !== "hammasi") rows = rows.filter((s) => s.status === filter);
  if (q) rows = rows.filter((s) => s.fullName.toLowerCase().includes(q.toLowerCase()));
  if (levelFilter) rows = rows.filter((s) => s.level === levelFilter);
  if (groupFilter) rows = rows.filter((s) => s.groups.some((g) => g.id === groupFilter));

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleCreate() {
    const res = await createStudent.mutateAsync({
      fullName: form.fullName,
      phone: form.phone,
      level: form.level || undefined,
      age: form.age ? Number(form.age) : undefined,
      groupId: form.groupId || undefined,
    });
    setTempPassword(res.tempPassword);
    setForm({ fullName: "", phone: "", level: "", age: "", groupId: "" });
  }

  return (
    <div>
      <PageHead title={`O'quvchilar — ${students?.length ?? 0} ta`}>
        <button className="btn sm primary" onClick={() => setShowForm((v) => !v)}>
          <Icon name="plus" size={15} /> O'quvchi qo'shish
        </button>
      </PageHead>

      {showForm && (
        <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <input className="inp" placeholder="F.I.Sh" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="inp" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="inp" placeholder="Daraja" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
            <input className="inp" placeholder="Yosh" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            <select className="inp" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Guruh tanlang</option>
              {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
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

      <Card className="fade-up">
        <div className="card-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <Segmented value={filter} onChange={setFilter} options={tabs} />
          <div className="spacer" />
          <div style={{ position: "relative" }}>
            <button className="btn sm" onClick={() => setShowFilters((v) => !v)}>
              <Icon name="filter" size={14} /> Filter
            </button>
            {showFilters && (
              <div className="menu-pop" style={{ minWidth: 200 }}>
                <div style={{ padding: "6px 8px", fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700 }}>Daraja</div>
                <select className="inp" value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} style={{ margin: "0 8px 8px" }}>
                  <option value="">Barchasi</option>
                  {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <div style={{ padding: "6px 8px", fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700 }}>Guruh</div>
                <select className="inp" value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }} style={{ margin: "0 8px 8px" }}>
                  <option value="">Barchasi</option>
                  {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <label className="search" style={{ minWidth: 200 }}>
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Ism bo'yicha qidirish…" />
          </label>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>O'quvchi</th><th>Guruhlar</th><th>Daraja</th><th>Telefon</th><th>To'lov</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Yuklanmoqda...</td></tr>}
              {pagedRows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="with-av">
                      <Avatar name={s.fullName} size="sm" />
                      <div>
                        <div className="cell-main">{s.fullName}</div>
                        <div className="cell-sub">{s.age ? `${s.age} yosh` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.groups.map((g) => <span className="badge neut" key={g.id} style={{ marginRight: 4 }}>{g.name}</span>)}</td>
                  <td className="cell-sub" style={{ fontWeight: 600, color: "var(--text-dim)" }}>{s.level}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{s.phone}</td>
                  <td><PaymentCell studentId={s.id} /></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => deleteStudent.mutate(s.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7}><div className="empty"><Icon name="search" size={28} /><div>Hech narsa topilmadi</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pager">
            <span className="info">{total} ta o'quvchidan {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, total)}</span>
            <button className="btn sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <Icon name="chevronLeft" size={14} />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{currentPage} / {totalPages}</span>
            <button className="btn sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

function PaymentCell({ studentId }: { studentId: string }) {
  const { data: packages, isLoading } = useStudentPackages(studentId);

  if (isLoading) return <span className="cell-sub">…</span>;

  const active = packages?.find((p) => p.status === "active");
  if (!active) return <span className="badge dang">Qarzdor</span>;

  const remaining = active.totalLessons - active.usedLessons;
  if (remaining <= 0) return <span className="badge dang">Qarzdor</span>;

  return (
    <span className="mono" style={{ fontSize: 12.5, fontWeight: 700 }}>
      {active.usedLessons}/{active.totalLessons}
    </span>
  );
}
