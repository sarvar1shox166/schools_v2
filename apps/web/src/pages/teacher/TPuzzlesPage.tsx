import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Icon } from "@chess-school/ui";
import { useMyPuzzles, useDeletePuzzle, usePuzzleAnalytics, type MyPuzzle } from "../../lib/queries.js";

const FILTER_TABS = [
  { v: "all",   label: "Barchasi" },
  { v: "oson",  label: "Oson" },
  { v: "orta",  label: "O'rta" },
  { v: "qiyin", label: "Qiyin" },
];

const DIFF_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  oson:  { bg: "#d1fae5", text: "#065f46", label: "Oson" },
  orta:  { bg: "#fef3c7", text: "#92400e", label: "O'rta" },
  qiyin: { bg: "#fee2e2", text: "#991b1b", label: "Qiyin" },
};

function AnalyticsDrawer({ puzzle, onClose }: { puzzle: MyPuzzle; onClose: () => void }) {
  const { data, isLoading } = usePuzzleAnalytics(puzzle.id);

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
      display:"grid", placeItems:"center", zIndex:999,
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:16, width:480, maxWidth:"95vw", maxHeight:"80vh",
        overflow:"auto", padding:24,
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>{puzzle.title ?? "Boshqotirma tahlili"}</div>
          <button className="iconbtn" onClick={onClose} style={{ border:"1px solid var(--border)", borderRadius:8 }}>
            <Icon name="x" size={14}/>
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-faint)" }}>Yuklanmoqda...</div>
        ) : data ? (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
              <div style={{ padding:"14px", borderRadius:10, background:"#dbeafe", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#1d4ed8" }}>{data.total}</div>
                <div style={{ fontSize:12, color:"#2563eb", marginTop:2 }}>Jami urinish</div>
              </div>
              <div style={{ padding:"14px", borderRadius:10, background:"#d1fae5", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#065f46" }}>{data.correct}</div>
                <div style={{ fontSize:12, color:"#059669", marginTop:2 }}>To'g'ri</div>
              </div>
              <div style={{ padding:"14px", borderRadius:10, background:"#fef3c7", textAlign:"center" }}>
                <div style={{ fontSize:22, fontWeight:800, color:"#92400e" }}>
                  {data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0}%
                </div>
                <div style={{ fontSize:12, color:"#d97706", marginTop:2 }}>Aniqlik</div>
              </div>
            </div>

            {data.attempts.length > 0 && (
              <>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>So'nggi urinishlar</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {data.attempts.map((a, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                      borderRadius:8, background:"var(--surface-2)",
                    }}>
                      <span style={{ fontSize:14 }}>{a.correct ? "✅" : "❌"}</span>
                      <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{a.fullName}</span>
                      <span style={{ fontSize:11, color:"var(--text-faint)" }}>
                        {new Date(a.attemptedAt).toLocaleDateString("uz-UZ")}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"32px 0", color:"var(--text-faint)" }}>Ma'lumot topilmadi</div>
        )}
      </div>
    </div>
  );
}

export default function TPuzzlesPage() {
  const navigate = useNavigate();
  const { data: puzzles = [], isLoading } = useMyPuzzles();
  const deletePuzzle = useDeletePuzzle();
  const [activeTab, setActiveTab]   = useState("all");
  const [analytics, setAnalytics]   = useState<MyPuzzle | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);

  const filtered = activeTab === "all" ? puzzles : puzzles.filter(p => p.difficulty === activeTab);

  const tabCount = (v: string) =>
    v === "all" ? puzzles.length : puzzles.filter(p => p.difficulty === v).length;

  async function handleDelete(id: string) {
    if (!confirm("Bu boshqotirmani o'chirishni tasdiqlaysizmi?")) return;
    setDeleting(id);
    try { await deletePuzzle.mutateAsync(id); }
    finally { setDeleting(null); }
  }

  return (
    <div style={{ padding:"var(--gap)", display:"flex", flexDirection:"column", gap:"var(--gap)" }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>Boshqotirmalar</h1>
        <p style={{ margin:"4px 0 0", color:"var(--text-faint)", fontSize:14 }}>Masalalar bazasi va tahlil</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"var(--gap)" }}>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="target" size={20} style={{ color:"#2563eb" }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:700 }}>{puzzles.length} ta</div>
              <div style={{ fontSize:13, color:"var(--text-faint)" }}>Jami masala</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="check" size={20} style={{ color:"#059669" }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:700 }}>{puzzles.filter(p=>p.difficulty==="oson").length} ta</div>
              <div style={{ fontSize:13, color:"var(--text-faint)" }}>Oson</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="flag" size={20} style={{ color:"#d97706" }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:700 }}>{puzzles.filter(p=>p.difficulty==="orta").length} ta</div>
              <div style={{ fontSize:13, color:"var(--text-faint)" }}>O'rta</div>
            </div>
          </div>
        </Card>
        <Card style={{ padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="eye" size={20} style={{ color:"#dc2626" }}/>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:700 }}>{puzzles.filter(p=>p.difficulty==="qiyin").length} ta</div>
              <div style={{ fontSize:13, color:"var(--text-faint)" }}>Qiyin</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:4 }}>
            <div style={{ width:28,height:28,borderRadius:7,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Icon name="target" size={15} style={{ color:"#2563eb" }}/>
            </div>
            <span style={{ fontWeight:700, fontSize:15 }}>Masalalar ro'yxati</span>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, flexWrap:"wrap" }}>
            {FILTER_TABS.map(tab => (
              <button key={tab.v} onClick={()=>setActiveTab(tab.v)}
                style={{
                  border: activeTab===tab.v ? "none" : "1px solid var(--border)",
                  background: activeTab===tab.v ? "var(--accent)" : "transparent",
                  color: activeTab===tab.v ? "#fff" : "var(--text-dim)",
                  borderRadius:99, padding:"5px 14px",
                  cursor:"pointer", fontSize:13,
                  fontWeight: activeTab===tab.v ? 600 : 400,
                }}>
                {tab.label} ({tabCount(tab.v)})
              </button>
            ))}
          </div>

          <button className="btn primary" onClick={()=>navigate("/teacher/puzzles/new")}
            style={{ display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
            <Icon name="plus" size={15}/> Qo'shish
          </button>
        </div>

        <div style={{ padding:20 }}>
          {isLoading ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-faint)" }}>Yuklanmoqda...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 0", gap:12 }}>
              <span style={{ fontSize:48 }}>🧩</span>
              <div style={{ fontWeight:700, fontSize:16 }}>Masala yo'q</div>
              <div style={{ color:"var(--text-faint)", fontSize:14 }}>Birinchi masalangizni qo'shing</div>
              <button className="btn primary" onClick={()=>navigate("/teacher/puzzles/new")}
                style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                <Icon name="plus" size={15}/> Qo'shish
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.map(puzzle => {
                const diff = DIFF_COLOR[puzzle.difficulty] ?? DIFF_COLOR.oson;
                return (
                  <div key={puzzle.id} style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"12px 14px", border:"1px solid var(--border)",
                    borderRadius:10, background:"var(--surface-2)",
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{puzzle.title ?? "—"}</div>
                      <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:2, fontFamily:"monospace",
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {puzzle.fen}
                      </div>
                      <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:1 }}>
                        {puzzle.solution.length} ta yurish · {puzzle.xpReward} XP
                      </div>
                    </div>

                    <span style={{
                      background:diff.bg, color:diff.text,
                      borderRadius:99, padding:"3px 10px",
                      fontSize:12, fontWeight:600, flexShrink:0,
                    }}>
                      {diff.label}
                    </span>

                    <button className="iconbtn" title="Tahlil" onClick={()=>setAnalytics(puzzle)}
                      style={{ border:"1px solid var(--border)", borderRadius:8 }}>
                      <Icon name="eye" size={14}/>
                    </button>

                    <button className="iconbtn" title="O'chirish"
                      disabled={deleting === puzzle.id}
                      onClick={()=>handleDelete(puzzle.id)}
                      style={{ border:"1px solid var(--border)", borderRadius:8, color:"var(--danger)" }}>
                      <Icon name="trash" size={14}/>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {analytics && <AnalyticsDrawer puzzle={analytics} onClose={()=>setAnalytics(null)}/>}
    </div>
  );
}
