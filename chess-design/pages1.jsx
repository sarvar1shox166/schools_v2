// pages1.jsx — Dashboard, Schedule, Teachers, Students
const D = window.DATA;

function toneVar(t) {
  return ({ accent: "var(--accent)", success: "var(--success)", warn: "var(--warn)", info: "var(--info)" })[t] || "var(--accent)";
}
function toneSoft(t) {
  const c = toneVar(t);
  return `color-mix(in oklab, ${c} 13%, var(--surface))`;
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ go }) {
  const max = Math.max(...D.GROWTH.map(g => g.v));
  return (
    <div className="content-inner page-enter">
      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="students" tone="a" value="248" label="Jami o'quvchilar" ghost="students"
          delta={<Delta dir="up">+12 bu oy</Delta>} />
        <StatCard icon="teacher" tone="i" value="8" label="O'qituvchilar" ghost="teacher"
          delta={<Delta dir="up">+1 yangi</Delta>} />
        <StatCard icon="income" tone="s" value="18.4M" label="Bu oy to'lov" ghost="income"
          delta={<Delta dir="up">+8% o'sish</Delta>} />
        <StatCard icon="alert" tone="d" value="3" label="To'liqsiz to'lov" ghost="alert"
          delta={<Delta dir="bad">e'tibor bering</Delta>} />
      </div>

      <div className="grid l-2-1" style={{ marginBottom: "var(--gap)" }}>
        <Card>
          <CardHead icon="user" title="Yangi arizalar" sub="Operator tekshirishi kerak"
            right={<button className="btn sm" onClick={() => go("students")}>Barchasi <Icon name="arrowRight" size={15} /></button>} />
          <table className="tbl">
            <thead><tr><th>Ism</th><th>Telefon</th><th>Vaqt</th><th>Holat</th></tr></thead>
            <tbody>
              {D.APPLICATIONS.map(a => (
                <tr key={a.id}>
                  <td><div className="with-av"><Avatar name={a.name} size="sm" /><div>
                    <div className="cell-main">{a.name}</div><div className="cell-sub">{a.note}</div></div></div></td>
                  <td className="mono" style={{ fontSize: 13 }}>{a.phone}</td>
                  <td className="cell-sub">{a.when}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHead icon="calendar" title="Bugungi darslar" sub="6 ta dars rejalashtirilgan"
            right={<button className="btn sm" onClick={() => go("schedule")}>Jadval</button>} />
          <div className="card-pad" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {D.TODAY_LESSONS.map((l, i) => (
              <div className="tl-item" key={i}>
                <div className="tl-time">{l.time}</div>
                <div className="tl-card" style={{ borderLeftColor: toneVar(l.tone), background: toneSoft(l.tone) }}>
                  <div className="ln-ttl">{l.title}</div>
                  <div className="ln-sub"><Icon name="teacher" size={13} /> {l.teacher} · {l.count} o'quvchi · {l.room}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid l-2-1">
        <Card>
          <CardHead icon="trendingUp" title="O'quvchilar o'sishi" sub="Oxirgi 6 oy"
            right={<span className="badge acc"><Icon name="trendingUp" size={12} /> +37.8%</span>} />
          <div className="card-pad">
            <div className="bars">
              {D.GROWTH.map((g, i) => (
                <div className="bar-col" key={g.m}>
                  <div className="bar" style={{ height: `${(g.v / max) * 100}%`, opacity: i === D.GROWTH.length - 1 ? 1 : 0.78 }}>
                    <span className="cap tnum">{g.v}</span>
                  </div>
                  <div className="bar-x">{g.m}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="groups" title="Guruh to'ldirilishi" sub="Joriy holatlar" />
          <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {D.GROUPS.slice(0, 5).map(g => (
              <div key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
                  <span style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: g.color }} />{g.name}
                  </span>
                  <span className="tnum" style={{ color: "var(--text-faint)", fontWeight: 700 }}>{g.count}/{g.cap}</span>
                </div>
                <div className="pbar"><span style={{ width: `${(g.count / g.cap) * 100}%`, background: g.color }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================ SCHEDULE ============================ */
function Schedule() {
  const [view, setView] = useState("hafta");
  return (
    <div className="content-inner page-enter">
      <PageHead title="Haftalik dars jadvali">
        <Segmented value={view} onChange={setView} options={[{ v: "kun", label: "Kun" }, { v: "hafta", label: "Hafta" }, { v: "oy", label: "Oy" }]} />
        <button className="btn sm"><Icon name="filter" size={15} /> Filtr</button>
        <button className="btn sm primary"><Icon name="plus" size={15} /> Dars qo'shish</button>
      </PageHead>

      <Card className="card-pad fade-up">
        <div className="sched">
          <div className="hcell">Vaqt</div>
          {D.SCHED_DAYS.map(d => <div className="hcell" key={d}>{d}</div>)}
          {D.SCHED_TIMES.map(time => (
            <React.Fragment key={time}>
              <div className="tcell">{time}</div>
              {D.SCHEDULE[time].map((cell, di) => (
                <div className="cell" key={di}>
                  {cell && (
                    <div className="lesson-blk">
                      <b>{cell.t}</b><span>{cell.s}</span>
                    </div>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <div className="grid cols-3" style={{ marginTop: "var(--gap)" }}>
        <StatCard icon="calendarCheck" tone="a" value="24" label="Haftalik darslar" />
        <StatCard icon="clock" tone="i" value="36 soat" label="Umumiy yuklama" />
        <StatCard icon="groups" tone="s" value="6 zal" label="Faol xonalar" />
      </div>
    </div>
  );
}

/* ============================ TEACHERS ============================ */
function Teachers() {
  return (
    <div className="content-inner page-enter">
      <PageHead title="O'qituvchilar — 8 ta">
        <button className="btn sm"><Icon name="download" size={15} /> Eksport</button>
        <button className="btn sm primary"><Icon name="plus" size={15} /> O'qituvchi qo'shish</button>
      </PageHead>

      <div className="grid cols-3">
        {D.TEACHERS.map(t => (
          <Card key={t.id} className="card-pad fade-up">
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Avatar name={t.name} size="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 750, fontSize: 15.5 }}>{t.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{t.spec}</div>
                <span className="badge acc" style={{ marginTop: 9 }}><Icon name="award" size={12} /> {t.title}</span>
              </div>
              <button className="iconbtn" style={{ width: 32, height: 32 }}><Icon name="dotsV" size={16} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <TeacherStat icon="groups" v={t.groups} l="Guruh" />
              <TeacherStat icon="students" v={t.students} l="O'quvchi" />
              <TeacherStat icon="star" v={t.rating} l="Reyting" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn sm" style={{ flex: 1 }}><Icon name="phone" size={14} /> Aloqa</button>
              <button className="btn sm" style={{ flex: 1 }}><Icon name="calendar" size={14} /> Jadval</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
function TeacherStat({ icon, v, l }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontWeight: 750, fontSize: 15 }}>
        <Icon name={icon} size={15} style={{ color: "var(--accent-text)" }} /> {v}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{l}</div>
    </div>
  );
}

/* ============================ STUDENTS ============================ */
function Students() {
  const [filter, setFilter] = useState("hammasi");
  const [q, setQ] = useState("");
  const tabs = [
    { v: "hammasi", label: "Hammasi" }, { v: "faol", label: "Faol" },
    { v: "yangi", label: "Yangi" }, { v: "qarzdor", label: "Qarzdor" },
  ];
  let rows = D.STUDENTS;
  if (filter === "qarzdor") rows = rows.filter(s => s.pay === "qarzdor");
  else if (filter !== "hammasi") rows = rows.filter(s => s.status === filter);
  if (q) rows = rows.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="content-inner page-enter">
      <PageHead title="O'quvchilar — 248 ta">
        <button className="btn sm"><Icon name="download" size={15} /> Eksport</button>
        <button className="btn sm primary"><Icon name="plus" size={15} /> O'quvchi qo'shish</button>
      </PageHead>

      <Card className="fade-up">
        <div className="card-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <Segmented value={filter} onChange={setFilter} options={tabs} />
          <div className="spacer" />
          <label className="search" style={{ minWidth: 200 }}>
            <Icon name="search" size={16} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ism bo'yicha qidirish…" />
          </label>
          <button className="btn sm"><Icon name="filter" size={15} /> Filtr</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>O'quvchi</th><th>Guruh</th><th>Daraja</th><th>Telefon</th><th>Status</th><th>To'lov</th><th></th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td><div className="with-av"><Avatar name={s.name} size="sm" /><div>
                    <div className="cell-main">{s.name}</div><div className="cell-sub">{s.age} yosh · {s.joined}</div></div></div></td>
                  <td><span className="badge neut">{s.group} guruh</span></td>
                  <td className="cell-sub" style={{ fontWeight: 600, color: "var(--text-dim)" }}>{s.level}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{s.phone}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><StatusBadge status={s.pay} /></td>
                  <td><button className="iconbtn" style={{ width: 30, height: 30 }}><Icon name="dotsV" size={15} /></button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7"><div className="empty"><Icon name="search" size={28} /><div>Hech narsa topilmadi</div></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "14px var(--pad-card)", borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--text-faint)" }}>
          <span>{rows.length} / 248 ko'rsatilmoqda</span>
          <div className="spacer" />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn sm"><Icon name="chevronLeft" size={15} /></button>
            <button className="btn sm primary" style={{ width: 32, padding: 0, justifyContent: "center" }}>1</button>
            <button className="btn sm" style={{ width: 32, padding: 0, justifyContent: "center" }}>2</button>
            <button className="btn sm" style={{ width: 32, padding: 0, justifyContent: "center" }}>3</button>
            <button className="btn sm"><Icon name="chevronRight" size={15} /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { Dashboard, Schedule, Teachers, Students, toneVar, toneSoft });
