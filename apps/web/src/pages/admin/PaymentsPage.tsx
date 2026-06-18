import { useState, useMemo } from "react";
import { Avatar, Card, Icon, StatCard } from "@chess-school/ui";

type PStatus = "tolangan" | "qarzdor";
type Method = "Click" | "Payme" | "Naqd" | "Uzcard";

type Payment = {
  id: string; student: string; group: string;
  amount: number; date: string | null; method: Method; status: PStatus;
};

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

const MOCK_PAYMENTS: Payment[] = [
  { id:"TXN-1042", student:"Sarvar Yo'ldoshev", group:"F", amount:450000, date:"06.06.2026", method:"Click",  status:"tolangan" },
  { id:"TXN-1041", student:"Malika Rashidova",  group:"B", amount:500000, date:"05.06.2026", method:"Payme",  status:"tolangan" },
  { id:"TXN-1040", student:"Bobur Nazarov",     group:"C", amount:400000, date:null,         method:"Naqd",   status:"qarzdor"  },
  { id:"TXN-1039", student:"Gulnoza Tosheva",   group:"A", amount:400000, date:"04.06.2026", method:"Uzcard", status:"tolangan" },
  { id:"TXN-1038", student:"Madina Aliyeva",    group:"B", amount:500000, date:null,         method:"Naqd",   status:"qarzdor"  },
  { id:"TXN-1037", student:"Javohir Saidov",    group:"D", amount:550000, date:"03.06.2026", method:"Payme",  status:"tolangan" },
  { id:"TXN-1036", student:"Aziz Tojiboyev",    group:"D", amount:550000, date:null,         method:"Naqd",   status:"qarzdor"  },
  { id:"TXN-1035", student:"Diyor Karimov",     group:"E", amount:750000, date:"02.06.2026", method:"Click",  status:"tolangan" },
];

const METHOD_CFG: Record<Method, { bg: string; color: string }> = {
  Click:  { bg:"#dbeafe", color:"#2563eb" },
  Payme:  { bg:"#dbeafe", color:"#2563eb" },
  Uzcard: { bg:"#dbeafe", color:"#2563eb" },
  Naqd:   { bg:"var(--surface-3)", color:"var(--text-dim)" },
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<"all"|"paid"|"debt">("all");

  const filtered = useMemo(() => {
    if (tab === "paid") return MOCK_PAYMENTS.filter(p => p.status === "tolangan");
    if (tab === "debt") return MOCK_PAYMENTS.filter(p => p.status === "qarzdor");
    return MOCK_PAYMENTS;
  }, [tab]);

  const totalReceived = MOCK_PAYMENTS.filter(p => p.status === "tolangan").reduce((s,p) => s+p.amount, 0);
  const totalDebt     = MOCK_PAYMENTS.filter(p => p.status === "qarzdor").reduce((s,p) => s+p.amount, 0);
  const paidCnt       = MOCK_PAYMENTS.filter(p => p.status === "tolangan").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--gap)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", margin:0 }}>To'lovlar</h2>
        <button className="btn primary"><Icon name="plus" size={15} /> To'lov qabul</button>
      </div>

      {/* KPI */}
      <div className="grid cols-4">
        <StatCard icon="wallet" tone="s"
          value={fmt(totalReceived)}
          label="Qabul qilingan (so'm)"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--success)"}}>↗ bu oy</span>}
        />
        <StatCard icon="trendingDown" tone="d"
          value={fmt(totalDebt)}
          label="Qarzdorlik (so'm)"
          delta={<span style={{fontSize:12,fontWeight:700,color:"var(--danger)"}}>⚠ 3 ta o'quvchi</span>}
        />
        <StatCard icon="check" tone="i" value={String(paidCnt)} label="To'langan" />
        <StatCard icon="clock" tone="w" value="3" label="Kutilayotgan" />
      </div>

      {/* Table card */}
      <Card style={{ padding:0 }}>
        {/* Filter tabs */}
        <div style={{ padding:"16px 20px 12px", display:"flex", gap:8 }}>
          {(["all","paid","debt"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:"5px 18px", borderRadius:99, fontSize:13, fontWeight:700,
              border: tab===t ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
              background: tab===t ? "var(--accent)" : "transparent",
              color: tab===t ? "#fff" : "var(--text-dim)", cursor:"pointer",
            }}>
              {t==="all"?"Hammasi":t==="paid"?"To'langan":"Qarzdor"}
            </button>
          ))}
        </div>

        <div style={{ overflowX:"auto" }}>
          <table className="tbl" style={{ minWidth:820 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>O'QUVCHI</th>
                <th>GURUH</th>
                <th>SUMMA</th>
                <th>SANA</th>
                <th>USUL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const mc = METHOD_CFG[p.method];
                return (
                  <tr key={p.id}>
                    <td style={{color:"var(--text-faint)",fontSize:13,fontWeight:600}}>{p.id}</td>
                    <td>
                      <div className="with-av">
                        <Avatar name={p.student} size="sm" style={{borderRadius:9,flexShrink:0}} />
                        <span className="cell-main">{p.student}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display:"inline-flex",alignItems:"center",justifyContent:"center",
                        width:28,height:28,borderRadius:8,
                        border:"1.5px solid var(--border)",
                        fontSize:13,fontWeight:700,color:"var(--text-dim)",
                      }}>{p.group}</span>
                    </td>
                    <td style={{fontWeight:800,fontSize:14}}>{fmt(p.amount)} so'm</td>
                    <td style={{color:"var(--text-faint)",fontSize:13.5}}>{p.date ?? "–"}</td>
                    <td>
                      <span style={{
                        display:"inline-flex",alignItems:"center",gap:5,
                        padding:"4px 11px",borderRadius:7,
                        background:mc.bg,color:mc.color,
                        fontSize:12.5,fontWeight:700,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        {p.method}
                      </span>
                    </td>
                    <td>
                      {p.status === "tolangan" ? (
                        <span style={{
                          display:"inline-flex",alignItems:"center",gap:5,
                          padding:"4px 12px",borderRadius:99,
                          background:"#dcfce71a",color:"#16a34a",
                          border:"1px solid #bbf7d0",fontSize:12.5,fontWeight:700,
                        }}><Icon name="check" size={11}/> to'langan</span>
                      ) : (
                        <span style={{
                          display:"inline-flex",alignItems:"center",gap:5,
                          padding:"4px 12px",borderRadius:99,
                          background:"#fee2e21a",color:"#ef4444",
                          border:"1px solid #fecaca",fontSize:12.5,fontWeight:700,
                        }}>⚠ qarzdor</span>
                      )}
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
