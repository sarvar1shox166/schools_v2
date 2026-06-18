import { useState } from "react";
import { Card, Icon } from "@chess-school/ui";

/* ─── Types ─── */
type GroupType = "guruh" | "individual";

type Group = {
  id: string;
  letter: string;
  name: string;
  level: string;
  type: GroupType;
  teacher: string;
  days: string;
  time: string;
  room: string;
  capacity: number;
  enrolled: number;
  color: string;
};

/* ─── Mock data ─── */
const INIT_GROUPS: Group[] = [
  { id:"1", letter:"A", name:"Boshlang'ich — A", level:"Boshlang'ich", type:"guruh",      teacher:"Nigora Saidova",    days:"Du·Chor·Ju", time:"09:00", room:"1-zal",   capacity:14, enrolled:12, color:"#3F8CFF" },
  { id:"2", letter:"B", name:"Taktika — B",      level:"3-razryad",   type:"guruh",      teacher:"Malika Yusupova",   days:"Se·Pay·Sha", time:"11:00", room:"2-zal",   capacity:12, enrolled:8,  color:"#10b981" },
  { id:"3", letter:"C", name:"Bolalar kursi — C",level:"Boshlang'ich", type:"guruh",      teacher:"Bobur Rahimov",     days:"Du·Chor·Ju", time:"14:00", room:"1-zal",   capacity:16, enrolled:15, color:"#f59e0b" },
  { id:"4", letter:"D", name:"Pozitsion — D",    level:"2-razryad",   type:"individual", teacher:"Dilnoza Ergasheva", days:"Se·Pay",     time:"16:00", room:"3-zal",   capacity:12, enrolled:10, color:"#ec4899" },
  { id:"5", letter:"E", name:"Pro Trening",      level:"Nomzod",      type:"individual", teacher:"Sardor Nazarov",    days:"Sha·Yak",    time:"10:00", room:"VIP-zal", capacity:8,  enrolled:6,  color:"#06b6d4" },
  { id:"6", letter:"F", name:"Blitz klub — F",   level:"1-razryad",   type:"guruh",      teacher:"Jasur Tursunov",    days:"Pay·Sha",    time:"18:00", room:"2-zal",   capacity:14, enrolled:11, color:"#22c55e" },
];

const LEVELS   = ["Boshlang'ich","1-razryad","2-razryad","3-razryad","4-razryad","Nomzod"];
const TEACHERS = ["Alisher Karimov","Malika Yusupova","Bobur Rahimov","Sardor Nazarov","Dilnoza Ergasheva","Jasur Tursunov","Nigora Saidova","Rustam Aliyev"];
const DAYS_OPT = ["Du·Chor·Ju","Se·Pay·Sha","Du·Chor","Se·Pay","Sha·Yak","Pay·Sha","Du·Cho·Ju·Pay"];
const ROOMS    = ["1-zal","2-zal","3-zal","VIP-zal","Online"];
const LETTERS  = ["A","B","C","D","E","F","G","H"];

/* ─── Page ─── */
export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>(INIT_GROUPS);
  const [view, setView] = useState<"card" | "list">("card");

  type Modal =
    | { mode: "add" }
    | { mode: "edit"; group: Group }
    | { mode: "delete"; group: Group }
    | null;
  const [modal, setModal] = useState<Modal>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function handleAdd(g: Group)     { setGroups((p) => [...p, g]); setModal(null); }
  function handleEdit(g: Group)    { setGroups((p) => p.map((x) => (x.id === g.id ? g : x))); setModal(null); }
  function handleDelete(id: string){ setGroups((p) => p.filter((x) => x.id !== id)); setModal(null); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}
      onClick={() => openMenu && setOpenMenu(null)}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          Guruhlar — {groups.length} ta
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {(["card","list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "7px 18px", border: "none", cursor: "pointer",
                background: view === v ? "var(--surface-2)" : "transparent",
                fontWeight: view === v ? 700 : 600, fontSize: 13.5,
                color: view === v ? "var(--text)" : "var(--text-faint)",
              }}>
                {v === "card" ? "Kartochka" : "Ro'yxat"}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => setModal({ mode: "add" })}>
            <Icon name="plus" size={15} /> Guruh ochish
          </button>
        </div>
      </div>

      {/* Card view */}
      {view === "card" && (
        <div className="grid cols-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              menuOpen={openMenu === g.id}
              onMenuToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}
              onEdit={() => { setModal({ mode: "edit", group: g }); setOpenMenu(null); }}
              onDelete={() => { setModal({ mode: "delete", group: g }); setOpenMenu(null); }}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>GURUH</th>
                  <th>O'QITUVCHI</th>
                  <th>KUNLAR · VAQT</th>
                  <th>XONA</th>
                  <th>TO'LDIRILGANLIK</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="with-av">
                        <LetterAvatar letter={g.letter} color={g.color} />
                        <div>
                          <div className="cell-main">{g.name}</div>
                          <div className="cell-sub">{g.level} · {g.type}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{g.teacher}</td>
                    <td className="cell-sub">{g.days} · {g.time}</td>
                    <td><span className="badge neut">{g.room}</span></td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="pbar" style={{ flex: 1, height: 6 }}>
                          <span style={{ width: `${Math.min(100,(g.enrolled/g.capacity)*100)}%`, background: g.color }} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-faint)", minWidth: 36 }}>
                          {g.enrolled}/{g.capacity}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ position: "relative" }}>
                        <button className="iconbtn" style={{ width: 30, height: 30 }}
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === g.id ? null : g.id); }}>
                          <Icon name="moreVertical" size={15} />
                        </button>
                        {openMenu === g.id && (
                          <DropMenu
                            onEdit={() => { setModal({ mode:"edit", group:g }); setOpenMenu(null); }}
                            onDelete={() => { setModal({ mode:"delete", group:g }); setOpenMenu(null); }}
                          />
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

      {/* Modals */}
      {modal?.mode === "add" && (
        <GroupModal mode="add" onClose={() => setModal(null)} onSave={handleAdd}
          nextLetter={LETTERS[groups.length] ?? "X"} nextId={String(groups.length + 1)} />
      )}
      {modal?.mode === "edit" && (
        <GroupModal mode="edit" group={modal.group} onClose={() => setModal(null)} onSave={handleEdit} />
      )}
      {modal?.mode === "delete" && (
        <DeleteModal group={modal.group} onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.group.id)} />
      )}
    </div>
  );
}

/* ─── Group card ─── */
function GroupCard({ group: g, menuOpen, onMenuToggle, onEdit, onDelete }: {
  group: Group;
  menuOpen: boolean;
  onMenuToggle: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Math.min(100, Math.round((g.enrolled / g.capacity) * 100));
  return (
    <Card style={{ padding: "20px 20px 18px" }}>
      {/* Top */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <LetterAvatar letter={g.letter} color={g.color} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 750, fontSize: 15.5, lineHeight: 1.25 }}>{g.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 4 }}>
            {g.level} · {g.type}
          </div>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onMenuToggle}>
            <Icon name="moreVertical" size={16} />
          </button>
          {menuOpen && <DropMenu onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        <InfoRow icon="teacher" text={g.teacher} />
        <InfoRow icon="calendar" text={`${g.days} · ${g.time}`} />
        <InfoRow icon="mapPin" text={`${g.room} · ${g.type}`} />
      </div>

      {/* Fill rate */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>To'ldirilganlik</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{g.enrolled}/{g.capacity}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--surface-3)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: g.color, transition: "width .4s" }} />
      </div>
    </Card>
  );
}

/* ─── Dropdown menu ─── */
function DropMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
      padding: "6px", minWidth: 140,
    }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onEdit} style={menuItemStyle(false)}>
        <Icon name="edit" size={14} /> Tahrirlash
      </button>
      <button onClick={onDelete} style={menuItemStyle(true)}>
        <Icon name="trash" size={14} /> O'chirish
      </button>
    </div>
  );
}

function menuItemStyle(danger: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "none", background: "transparent", cursor: "pointer",
    fontSize: 13.5, fontWeight: 600, textAlign: "left",
    color: danger ? "#ef4444" : "var(--text)",
  };
}

/* ─── Group add/edit modal ─── */
type GroupModalProps =
  | { mode: "add"; group?: undefined; onClose: () => void; onSave: (g: Group) => void; nextLetter: string; nextId: string }
  | { mode: "edit"; group: Group;     onClose: () => void; onSave: (g: Group) => void; nextLetter?: string; nextId?: string };

function GroupModal({ mode, group, onClose, onSave, nextLetter = "A", nextId = "1" }: GroupModalProps) {
  const [form, setForm] = useState({
    name:     group?.name     ?? "",
    level:    group?.level    ?? "Boshlang'ich",
    type:     group?.type     ?? ("guruh" as GroupType),
    teacher:  group?.teacher  ?? "Alisher Karimov",
    days:     group?.days     ?? "Du·Chor·Ju",
    time:     group?.time     ?? "09:00",
    room:     group?.room     ?? "1-zal",
    capacity: group?.capacity ? String(group.capacity) : "12",
  });

  function handleSave() {
    onSave({
      id:       group?.id ?? nextId,
      letter:   group?.letter ?? nextLetter,
      name:     form.name,
      level:    form.level,
      type:     form.type,
      teacher:  form.teacher,
      days:     form.days,
      time:     form.time,
      room:     form.room,
      capacity: Number(form.capacity) || 12,
      enrolled: group?.enrolled ?? 0,
      color:    group?.color ?? "#6366f1",
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>
          {mode === "add" ? "Yangi guruh qo'shish" : "Guruhni tahrirlash"}
        </div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <div style={{ height: 1, background: "var(--border)" }} />

      <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* GURUH NOMI */}
        <FieldWrap label="GURUH NOMI">
          <input className="inp" value={form.name} placeholder="Guruh nomini kiriting"
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>

        {/* DARAJASI + TURI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="DARAJASI">
            <SelectField value={form.level} onChange={(v) => setForm({ ...form, level: v })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="TURI">
            <SelectField value={form.type} onChange={(v) => setForm({ ...form, type: v as GroupType })}>
              <option value="guruh">guruh</option>
              <option value="individual">individual</option>
            </SelectField>
          </FieldWrap>
        </div>

        {/* O'QITUVCHI */}
        <FieldWrap label="O'QITUVCHI">
          <SelectField value={form.teacher} onChange={(v) => setForm({ ...form, teacher: v })}>
            {TEACHERS.map((t) => <option key={t}>{t}</option>)}
          </SelectField>
        </FieldWrap>

        {/* KUNLAR + VAQT */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 14 }}>
          <FieldWrap label="KUNLAR">
            <SelectField value={form.days} onChange={(v) => setForm({ ...form, days: v })}>
              {DAYS_OPT.map((d) => <option key={d}>{d}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="VAQT">
            <input className="inp" type="time" value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </FieldWrap>
        </div>

        {/* XONA + SIG'IMI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <FieldWrap label="XONA">
            <SelectField value={form.room} onChange={(v) => setForm({ ...form, room: v })}>
              {ROOMS.map((r) => <option key={r}>{r}</option>)}
            </SelectField>
          </FieldWrap>
          <FieldWrap label="SIG'IMI">
            <input className="inp" type="number" min={1} max={50} value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </FieldWrap>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
            Bekor
          </button>
          <button className="btn primary" style={{ flex: 2, justifyContent: "center" }}
            onClick={handleSave} disabled={!form.name}>
            <Icon name="check" size={15} /> Saqlash
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Delete modal ─── */
function DeleteModal({ group, onClose, onConfirm }: {
  group: Group;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>O'chirishni tasdiqlash</div>
        <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div style={{ padding: "10px 24px 32px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 18px", borderRadius: 18,
          background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="trash" size={32} style={{ color: "var(--text-faint)" }} />
        </div>
        <div style={{ fontWeight: 750, fontSize: 16, marginBottom: 8 }}>{group.name}</div>
        <div style={{ fontSize: 13.5, color: "var(--text-faint)" }}>Bu guruhni o'chirmoqchimisiz?</div>
      </div>
      <div style={{ height: 1, background: "var(--border)" }} />
      <div style={{ display: "flex", gap: 12, padding: "18px 24px" }}>
        <button className="btn" style={{ flex: 1, justifyContent: "center", fontWeight: 700 }} onClick={onClose}>
          Bekor
        </button>
        <button onClick={onConfirm} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "0 20px", height: 42, borderRadius: 10,
          background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14,
          border: "none", cursor: "pointer",
        }}>
          <Icon name="trash" size={14} /> O'chirish
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Shared ─── */
function LetterAvatar({ letter, color, size = 40 }: { letter: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: color, color: "#fff", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: Math.round(size * 0.43),
    }}>
      {letter}
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
      <Icon name={icon} size={14} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>{text}</span>
    </div>
  );
}

function ModalShell({ children, onClose, width = 480 }: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 18,
        width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)",
      }}>
        {children}
      </div>
    </div>
  );
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.06em", color: "var(--text-faint)",
        marginBottom: 7, textTransform: "uppercase",
      }}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", paddingRight: 36, width: "100%" }}>
        {children}
      </select>
      <Icon name="chevronDown" size={14} style={{
        position: "absolute", right: 12, top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)",
      }} />
    </div>
  );
}
