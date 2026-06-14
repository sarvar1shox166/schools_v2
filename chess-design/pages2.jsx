// pages2.jsx — Groups, Attendance, Payments, Income, Notifications, Reports
const D2 = window.DATA;

/* ========================= GROUPS ========================= */
function Groups() {
  const [view, setView] = React.useState("grid");
  return (
    <div className="content-inner page-enter">
      <PageHead title="Guruhlar — 6 ta">
        <Segmented value={view} onChange={setView}
          options={[{ v: "grid", label: "Kartochka" }, { v: "list", label: "Ro'yxat" }]} />
        <button className="btn sm primary"><Icon name="plus" size={15} /> Guruh ochish</button>
      </PageHead>

      {view === "grid" ? (
        <div className="grid cols-3">
          {D2.GROUPS.map(g => (
            <Card key={g.id} className="fade-up">
              <div className="card-pad" style={{ paddingBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center",
                    color: "#fff", flexShrink: 0, background: g.color, fontWeight: 800, fontSize: 18 }}>{g.id}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 750, fontSize: 15 }}>{g.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{g.level} daraja</div>
                  </div>
                  <button className="iconbtn" style={{ width: 32, height: 32 }}><Icon name="dotsV" size={16} /></button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 15 }}>
                  {[["teacher", g.teacher], ["calendar", `${g.days} · ${g.time}`], ["pin", g.room]].map(([ic, v]) => (
                    <div key={ic} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--text-dim)" }}>
                      <Icon name={ic} size={14} style={{ color: "var(--text-faint)" }} /> {v}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12.5 }}>
                    <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>To'ldirilganlik</span>
                    <span className="tnum" style={{ fontWeight: 750 }}>{g.count}/{g.cap}</span>
                  </div>
                  <div className="pbar"><span style={{ width: `${(g.count / g.cap) * 100}%`, background: g.color }} /></div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button className="btn sm" style={{ flex: 1 }}><Icon name="students" size={14} /> O'quvchilar</button>
                  <button className="btn sm" style={{ flex: 1 }}><Icon name="calendar" size={14} /> Jadval</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="fade-up">
          <table className="tbl">
            <thead><tr><th>Guruh</th><th>O'qituvchi</th><th>Kunlar / Vaqt</th><th>Xona</th><th>To'ldirilganlik</th><th></th></tr></thead>
            <tbody>
              {D2.GROUPS.map(g => (
                <tr key={g.id}>
                  <td>
                    <div className="with-av">
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: g.color, color: "#fff",
                        display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{g.id}</div>
                      <div><div className="cell-main">{g.name}</div><div className="cell-sub">{g.level}</div></div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{g.teacher}</td>
                  <td className="cell-sub">{g.days} · {g.time}</td>
                  <td><span className="badge neut">{g.room}</span></td>
                  <td style={{ minWidth: 170 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="pbar" style={{ flex: 1 }}><span style={{ width: `${(g.count / g.cap) * 100}%`, background: g.color }} /></div>
                      <span className="tnum cell-sub" style={{ fontWeight: 700, minWidth: 36 }}>{g.count}/{g.cap}</span>
                    </div>
                  </td>
                  <td><button className="iconbtn" style={{ width: 30, height: 30 }}><Icon name="dotsV" size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ========================= ATTENDANCE ========================= */
function Attendance() {
  const counts = { p: 0, a: 0, l: 0 };
  D2.ATTENDANCE.forEach(r => r.marks.forEach(m => { if (m in counts) counts[m]++; }));
  const total = counts.p + counts.a + counts.l;
  const legend = [
    { k: "p", icon: "check", label: "Keldi" },
    { k: "a", icon: "x", label: "Kelmadi" },
    { k: "l", icon: "clock", label: "Kechikdi" },
  ];
  return (
    <div className="content-inner page-enter">
      <PageHead title="Davomat jurnali">
        <button className="btn sm"><Icon name="calendar" size={15} /> May 2026</button>
        <button className="btn sm primary"><Icon name="check" size={15} /> Davomat belgilash</button>
      </PageHead>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="percent" tone="s" value={`${Math.round(counts.p / total * 100)}%`} label="O'rtacha davomat"
          delta={<Delta dir="up">+3% o'tgan oyga</Delta>} />
        <StatCard icon="check" tone="a" value={counts.p} label="Kelganlar (seans)" />
        <StatCard icon="clock" tone="w" value={counts.l} label="Kechikkanlar" />
        <StatCard icon="x" tone="d" value={counts.a} label="Kelmaganlar" />
      </div>

      <Card className="fade-up">
        <div className="card-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="head-ic"><Icon name="attendance" size={18} /></div>
          <div style={{ flex: 1 }}>
            <div className="ttl">Davomat jadvali</div>
            <div className="sub">Oxirgi 8 dars · seans</div>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {legend.map(l => (
              <span key={l.k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-dim)" }}>
                <span className={"att " + l.k} style={{ width: 22, height: 22 }}><Icon name={l.icon} size={12} /></span>{l.label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>O'quvchi</th>
                <th>Guruh</th>
                {D2.ATT_DATES.map(d => <th key={d} style={{ textAlign: "center", minWidth: 48 }}>{d}</th>)}
                <th style={{ textAlign: "center" }}>%</th>
              </tr>
            </thead>
            <tbody>
              {D2.ATTENDANCE.map((r, i) => {
                const p = r.marks.filter(m => m === "p").length;
                const pct = Math.round(p / r.marks.length * 100);
                return (
                  <tr key={i}>
                    <td>
                      <div className="with-av">
                        <Avatar name={r.name} size="sm" />
                        <span className="cell-main">{r.name}</span>
                      </div>
                    </td>
                    <td><span className="badge neut">{r.group}</span></td>
                    {r.marks.map((m, j) => (
                      <td key={j} style={{ textAlign: "center" }}>
                        <span className={"att " + m} style={{ margin: "0 auto" }}>
                          <Icon name={{ p: "check", a: "x", l: "clock", n: "dots" }[m]} size={12} />
                        </span>
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>
                      <span className={"badge " + (pct >= 80 ? "suc" : pct >= 60 ? "warn" : "dang")}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ========================= PAYMENTS ========================= */
function Payments() {
  const [tab, setTab] = React.useState("hammasi");
  let rows = D2.PAYMENTS;
  if (tab === "to'langan") rows = rows.filter(p => p.status === "to'langan");
  else if (tab === "qarzdor") rows = rows.filter(p => p.status === "qarzdor");
  const paid = D2.PAYMENTS.filter(p => p.status === "to'langan").reduce((a, b) => a + b.amount, 0);
  const debt = D2.PAYMENTS.filter(p => p.status === "qarzdor").reduce((a, b) => a + b.amount, 0);
  return (
    <div className="content-inner page-enter">
      <PageHead title="To'lovlar">
        <button className="btn sm"><Icon name="download" size={15} /> Eksport</button>
        <button className="btn sm primary"><Icon name="plus" size={15} /> To'lov qabul qilish</button>
      </PageHead>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="wallet" tone="s" value={fmtSom(paid)} label="Qabul qilingan (so'm)"
          delta={<Delta dir="up">bu oy</Delta>} />
        <StatCard icon="alert" tone="d" value={fmtSom(debt)} label="Qarzdorlik (so'm)"
          delta={<Delta dir="bad">3 ta o'quvchi</Delta>} />
        <StatCard icon="check" tone="a" value="6" label="To'langan to'lovlar" />
        <StatCard icon="clock" tone="w" value="3" label="Kutilayotgan" />
      </div>

      <Card className="fade-up">
        <div className="card-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <Segmented value={tab} onChange={setTab} options={[
            { v: "hammasi", label: "Hammasi" },
            { v: "to'langan", label: "To'langan" },
            { v: "qarzdor", label: "Qarzdor" },
          ]} />
          <div className="spacer" />
          <button className="btn sm"><Icon name="filter" size={15} /> Filtr</button>
          <button className="btn sm"><Icon name="calendar" size={15} /> Iyun 2026</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>ID</th><th>O'quvchi</th><th>Guruh</th><th>Summa</th><th>Sana</th><th>Usul</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td className="mono cell-sub" style={{ fontSize: 12 }}>{p.id}</td>
                  <td>
                    <div className="with-av">
                      <Avatar name={p.name} size="sm" />
                      <span className="cell-main">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="badge neut">{p.group}</span></td>
                  <td className="tnum" style={{ fontWeight: 750 }}>{fmtSom(p.amount)} so'm</td>
                  <td className="mono cell-sub" style={{ fontSize: 12.5 }}>{p.date}</td>
                  <td><span className="badge info"><Icon name="payments" size={12} /> {p.method}</span></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td><button className="iconbtn" style={{ width: 30, height: 30 }}><Icon name="dotsV" size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ========================= INCOME ========================= */
function Income() {
  const max = Math.max(...D2.INCOME_MONTHS.map(m => m.v));
  const total = D2.INCOME_SPLIT.reduce((a, b) => a + b.v, 0);
  let acc = 0;
  const conic = D2.INCOME_SPLIT.map(s => {
    const st = (acc / total * 360).toFixed(1);
    acc += s.v;
    const en = (acc / total * 360).toFixed(1);
    return `${s.c} ${st}deg ${en}deg`;
  }).join(", ");

  return (
    <div className="content-inner page-enter">
      <PageHead title="Daromadlar tahlili">
        <Segmented value="oy" onChange={() => {}} options={[
          { v: "hafta", label: "Hafta" }, { v: "oy", label: "Oy" }, { v: "yil", label: "Yil" }
        ]} />
        <button className="btn sm"><Icon name="download" size={15} /> PDF</button>
      </PageHead>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="income" tone="s" value="18.4M" label="Iyun daromadi" delta={<Delta dir="up">+8%</Delta>} />
        <StatCard icon="trendingUp" tone="a" value="93.0M" label="Yil boshidan" delta={<Delta dir="up">+22%</Delta>} />
        <StatCard icon="target" tone="i" value="92%" label="Reja bajarilishi" />
        <StatCard icon="percent" tone="w" value="74K" label="O'rtacha / o'quvchi" />
      </div>

      <div className="grid l-2-1">
        <Card>
          <CardHead icon="trendingUp" title="Oylik daromad" sub="Million so'mda"
            right={<span className="badge acc"><Icon name="trendingUp" size={12} /> +37.8%</span>} />
          <div className="card-pad">
            <div className="bars">
              {D2.INCOME_MONTHS.map((m, i) => (
                <div className="bar-col" key={m.m}>
                  <div className="bar" style={{ height: `${(m.v / max) * 100}%`, opacity: i === D2.INCOME_MONTHS.length - 1 ? 1 : 0.76 }}>
                    <span className="cap tnum" style={{ fontSize: 12 }}>{m.v}M</span>
                  </div>
                  <div className="bar-x">{m.m}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="layers" title="Manbalar bo'yicha" sub="Iyun 2026" />
          <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto" }}>
              <div style={{
                width: 150, height: 150, borderRadius: "50%",
                background: `conic-gradient(${conic})`,
              }} />
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                width: 96, height: 96, borderRadius: "50%", background: "var(--surface)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>18.4M</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>jami</div>
              </div>
            </div>
            <div className="legend">
              {D2.INCOME_SPLIT.map(s => (
                <div className="row" key={s.nm}>
                  <span className="sw" style={{ background: s.c }} />
                  <span className="nm">{s.nm}</span>
                  <span className="vl">{s.v}M</span>
                  <span className="cell-sub" style={{ minWidth: 40, textAlign: "right" }}>
                    {Math.round(s.v / total * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--gap)" }}>
        <Card>
          <CardHead icon="payments" title="Usul bo'yicha taqsimot" sub="To'lov turlari ulushi" />
          <div className="card-pad">
            <div style={{ display: "flex", gap: "var(--gap)", flexWrap: "wrap" }}>
              {[
                { nm: "Payme", pct: 42, c: "#0ea5e9" },
                { nm: "Click", pct: 31, c: "#6366f1" },
                { nm: "Uzcard", pct: 15, c: "#14b8a6" },
                { nm: "Naqd", pct: 12, c: "#f59e0b" },
              ].map(m => (
                <div key={m.nm} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 650, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: m.c, display: "inline-block" }} />
                      {m.nm}
                    </span>
                    <span className="tnum" style={{ fontWeight: 750 }}>{m.pct}%</span>
                  </div>
                  <div className="pbar" style={{ height: 10 }}>
                    <span style={{ width: `${m.pct}%`, background: m.c }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ========================= NOTIFICATIONS ========================= */
function Notifications() {
  const [filter, setFilter] = React.useState("hammasi");
  const typeColors = { ariza: "acc", tolov: "suc", ogoh: "dang", davomat: "info", dars: "neut" };
  let notifs = D2.NOTIFS;
  if (filter === "oqilmagan") notifs = notifs.filter(n => n.unread);
  return (
    <div className="content-inner page-enter">
      <PageHead title="Bildirishnomalar">
        <Segmented value={filter} onChange={setFilter} options={[
          { v: "hammasi", label: "Hammasi" }, { v: "oqilmagan", label: "O'qilmagan" }
        ]} />
        <button className="btn sm"><Icon name="check" size={15} /> Barchasini o'qish</button>
      </PageHead>

      <div className="grid l-2-1">
        <Card className="fade-up">
          <div className="card-head">
            <div className="head-ic"><Icon name="bell" size={18} /></div>
            <div style={{ flex: 1 }}><div className="ttl">So'nggi bildirishnomalar</div></div>
            <span className="badge dang">{D2.NOTIFS.filter(n => n.unread).length} yangi</span>
          </div>
          <div className="list">
            {notifs.map(n => (
              <div className="li" key={n.id} style={{ alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center",
                  flexShrink: 0, background: "var(--accent-soft)", color: "var(--accent-text)"
                }}>
                  <Icon name={n.icon} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                    {n.unread && <span className="sdot" style={{ background: "var(--accent)" }} />}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 3 }}>{n.body}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 5 }}>{n.when}</div>
                </div>
                <span className={"badge " + (typeColors[n.type] || "neut")} style={{ marginTop: 2, flexShrink: 0 }}>
                  {n.type}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="bell" size={17} style={{ color: "var(--accent-text)" }} /> Statistika
            </div>
            <div className="kpi-grid">
              {[
                { v: "12", l: "Bu hafta" }, { v: "3", l: "O'qilmagan" },
                { v: "6", l: "Arizalar" }, { v: "3", l: "To'lov ogoh." },
              ].map(k => (
                <div className="kpi" key={k.l}>
                  <div className="v">{k.v}</div>
                  <div className="l">{k.l}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="card-pad fade-up">
            <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="settings" size={17} style={{ color: "var(--accent-text)" }} /> Sozlamalar
            </div>
            {[
              { label: "Yangi ariza", on: true },
              { label: "To'lov qabul qilish", on: true },
              { label: "Qarzdorlik eslatma", on: true },
              { label: "Davomat xabari", on: false },
              { label: "Guruh to'lib qolish", on: true },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5 }}>
                <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>{s.label}</span>
                <div style={{
                  width: 38, height: 22, borderRadius: 11, background: s.on ? "var(--accent)" : "var(--border-strong)",
                  position: "relative", cursor: "pointer", transition: "background .2s",
                }}>
                  <div style={{
                    position: "absolute", top: 3, left: s.on ? 19 : 3, width: 16, height: 16,
                    borderRadius: "50%", background: "#fff", transition: "left .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.2)"
                  }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ========================= REPORTS ========================= */
function Reports() {
  return (
    <div className="content-inner page-enter">
      <PageHead title="Hisobotlar">
        <button className="btn sm"><Icon name="refresh" size={15} /> Yangilash</button>
        <button className="btn sm primary"><Icon name="download" size={15} /> Hisobot yuklash</button>
      </PageHead>

      <div className="grid cols-4" style={{ marginBottom: "var(--gap)" }}>
        <StatCard icon="reports" tone="a" value="18.4M" label="Iyun daromadi" delta={<Delta dir="up">+8%</Delta>} />
        <StatCard icon="students" tone="i" value="248" label="Jami o'quvchilar" delta={<Delta dir="up">+12</Delta>} />
        <StatCard icon="attendance" tone="s" value="87%" label="O'rtacha davomat" delta={<Delta dir="up">+3%</Delta>} />
        <StatCard icon="award" tone="w" value="3" label="Turnir g'oliblari" />
      </div>

      <div className="grid cols-2" style={{ marginBottom: "var(--gap)" }}>
        {[
          { icon: "income", title: "Moliyaviy hisobot", desc: "Daromad, xarajat, qarzdorlik", badge: "Tayyor", bCls: "suc" },
          { icon: "students", title: "O'quvchilar hisoboti", desc: "Qabul, chiqish, faollik", badge: "Tayyor", bCls: "suc" },
          { icon: "attendance", title: "Davomat hisoboti", desc: "Guruh va individual davomat", badge: "Tayyor", bCls: "suc" },
          { icon: "trendingUp", title: "O'sish tahlili", desc: "Oylik / yillik dinamika", badge: "Yangi", bCls: "acc" },
          { icon: "teacher", title: "O'qituvchi faoliyati", desc: "Darslar, o'quvchilar, baho", badge: "Tayyor", bCls: "suc" },
          { icon: "groups", title: "Guruh samaradorligi", desc: "To'ldirilganlik va natijalar", badge: "Tayyorlanmoqda", bCls: "warn" },
        ].map(r => (
          <Card key={r.title} className="fade-up">
            <div className="card-pad" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="head-ic" style={{ width: 46, height: 46, borderRadius: 13 }}>
                <Icon name={r.icon} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 750, fontSize: 15 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>{r.desc}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <span className={"badge " + r.bCls}>{r.badge}</span>
                <button className="btn sm"><Icon name="download" size={14} /> Yuklab olish</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="fade-up">
        <CardHead icon="calendar" title="Oylik qiyoslash" sub="O'quvchilar soni — Yanvar–Iyun 2026" />
        <div className="card-pad">
          <div style={{ display: "flex", gap: "var(--gap)" }}>
            <div style={{ flex: 2 }}>
              <div className="bars" style={{ height: 160 }}>
                {D2.GROWTH.map((g, i) => {
                  const maxV = Math.max(...D2.GROWTH.map(x => x.v));
                  return (
                    <div className="bar-col" key={g.m}>
                      <div className="bar" style={{ height: `${(g.v / maxV) * 100}%`, opacity: i === D2.GROWTH.length - 1 ? 1 : 0.72 }}>
                        <span className="cap tnum" style={{ fontSize: 11.5 }}>{g.v}</span>
                      </div>
                      <div className="bar-x">{g.m}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, borderLeft: "1px solid var(--border)", paddingLeft: "var(--gap)", display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
              {[
                { label: "Umumiy o'sish", v: "+37.8%", icon: "trendingUp", tone: "var(--success)" },
                { label: "Eng faol oy", v: "Iyun", icon: "star", tone: "var(--warn)" },
                { label: "Chiqib ketdi", v: "4 ta", icon: "x", tone: "var(--danger)" },
                { label: "Yangi keldi", v: "28 ta", icon: "plus", tone: "var(--accent-text)" },
              ].map(k => (
                <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)",
                    display: "grid", placeItems: "center", color: k.tone }}>
                    <Icon name={k.icon} size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{k.v}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { Groups, Attendance, Payments, Income, Notifications, Reports });
