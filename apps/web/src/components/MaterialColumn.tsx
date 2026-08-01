/* ── Material advantage + captured pieces (left sidebar of the game panel) ── */
export function MaterialColumn({ diff, byWhite, byBlack }: { diff: number; byWhite: string[]; byBlack: string[] }) {
  const pct = Math.max(6, Math.min(94, 50 - diff * 4));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 14, padding: "10px 8px" }}>
        <div style={{ color: "#54555e", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textAlign: "center", marginBottom: 8 }}>USTUN</div>
        <div className="material-col-bar" style={{ position: "relative", width: "100%", height: 280, borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,#f5f5f6 0%,#f5f5f6 ${pct}%,#18181c ${pct}%,#18181c 100%)` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: `${pct}%`, height: 2, background: "linear-gradient(90deg,transparent,#f59e0b,transparent)", boxShadow: "0 0 8px rgba(245,158,11,0.6)" }} />
          <div style={{ position: "absolute", left: 4, top: 6, color: "#0a0a0c", fontSize: 10.5, fontWeight: 800 }}>{diff > 0 ? `+${diff}` : diff}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 2px", color: "#65666f", fontSize: 9.5, fontWeight: 700 }}>
          <div>Oq</div><div>Qora</div>
        </div>
      </div>

      <div style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 14, padding: 10 }}>
        <div style={{ color: "#54555e", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textAlign: "center", marginBottom: 8 }}>OLINGAN</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ minHeight: 26, padding: 5, background: "#18181c", border: byWhite.length ? "1px solid #232328" : "1px dashed #232328", borderRadius: 8, textAlign: "center", fontSize: 16, lineHeight: 1, color: byWhite.length ? "#c7d0e8" : "#3a3a42", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 2 }}>
            {byWhite.length ? byWhite.map((p, i) => <span key={i}>{p}</span>) : "—"}
          </div>
          <div style={{ minHeight: 26, padding: 5, background: "#18181c", border: byBlack.length ? "1px solid #232328" : "1px dashed #232328", borderRadius: 8, textAlign: "center", fontSize: 16, lineHeight: 1, color: byBlack.length ? "#c7d0e8" : "#3a3a42", display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 2 }}>
            {byBlack.length ? byBlack.map((p, i) => <span key={i}>{p}</span>) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
