import { Card, CardHead, Icon, StatCard } from "@chess-school/ui";

const BAR_DATA = [
  { month:"Yan", value:12.8 },
  { month:"Fev", value:13.5 },
  { month:"Mar", value:15.1 },
  { month:"Apr", value:16.0 },
  { month:"May", value:17.2 },
  { month:"Iyu", value:18.4 },
];

const DONUT_DATA = [
  { label:"Guruh darslari",     value:"11.2M", pct:61, color:"#3b82f6" },
  { label:"Individual trening", value:"4.6M",  pct:25, color:"#10b981" },
  { label:"Turnirlar",          value:"1.8M",  pct:10, color:"#f59e0b" },
  { label:"Boshqa",             value:"0.8M",  pct:4,  color:"#ec4899" },
];

const maxBar = 18.4;

export default function IncomeReportPage() {
  /* conic-gradient for donut */
  let acc = 0;
  const stops = DONUT_DATA.map(d => {
    const part = `${d.color} ${acc}% ${acc + d.pct}%`;
    acc += d.pct;
    return part;
  });
  const donutBg = `conic-gradient(${stops.join(", ")})`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", margin:0 }}>Daromadlar tahlili</h2>
        <button className="btn" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Icon name="download" size={14}/> PDF
        </button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="wallet" tone="s"
          value="18.4M"
          label="Iyun daromadi"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--success)"}}>↗ +8%</span>}
        />
        <StatCard icon="trendingUp" tone="i"
          value="93.0M"
          label="Yil boshidan"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--success)"}}>↗ +22%</span>}
        />
        <StatCard icon="target" tone="w"
          value="92%"
          label="Reja bajarilishi"
        />
        <StatCard icon="percent" tone="d"
          value="74K"
          label="O'rtacha / o'quvchi"
        />
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"var(--gap)" }}>

        {/* Bar chart */}
        <Card style={{ padding:0 }}>
          <div style={{ padding:"18px 22px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:15.5 }}>Oylik daromad</div>
              <div style={{ fontSize:12.5, color:"var(--text-faint)", marginTop:2 }}>Million so'mda</div>
            </div>
            <span style={{
              padding:"4px 12px", borderRadius:99,
              background:"#dbeafe", color:"#2563eb",
              fontSize:12.5, fontWeight:800,
            }}>+37.8%</span>
          </div>

          {/* Bars */}
          <div style={{
            padding:"24px 22px 20px",
            display:"flex", alignItems:"flex-end", gap:12,
            height:240,
          }}>
            {BAR_DATA.map(b => {
              const h = Math.max(8, (b.value / maxBar) * 160);
              return (
                <div key={b.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div style={{
                    fontSize:11, fontWeight:700, color:"var(--text-faint)",
                  }}>{b.value}M</div>
                  <div style={{
                    width:"100%", height:h, borderRadius:"6px 6px 0 0",
                    background:"#93c5fd",
                  }} />
                  <div style={{ fontSize:12, color:"var(--text-faint)", fontWeight:600 }}>{b.month}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Donut chart */}
        <Card style={{ padding:0 }}>
          <CardHead icon="layers" title="Manbalar" sub="Iyun 2026" />

          <div style={{ padding:"16px 22px 22px", display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
            {/* Donut */}
            <div style={{
              width:180, height:180, borderRadius:"50%",
              background:donutBg, position:"relative",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <div style={{
                width:110, height:110, borderRadius:"50%",
                background:"var(--surface)",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                gap:2,
              }}>
                <div style={{ fontWeight:800, fontSize:20 }}>18.4M</div>
                <div style={{ fontSize:11.5, color:"var(--text-faint)", fontWeight:600 }}>jami</div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:8 }}>
              {DONUT_DATA.map(d => (
                <div key={d.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:d.color, flexShrink:0 }} />
                  <div style={{ flex:1, fontSize:13, fontWeight:600 }}>{d.label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--text-dim)" }}>{d.value}</div>
                  <div style={{ fontSize:12, color:"var(--text-faint)", minWidth:28, textAlign:"right" }}>{d.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
