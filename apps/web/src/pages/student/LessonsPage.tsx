import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Avatar, Card, showXp } from "@chess-school/ui";
import {
  useAttendanceHistory,
  useCompleteHomework,
  useHomework,
  useMyPackages,
  useNextLesson,
  useSchedule,
  type Homework,
  type ScheduleSlot,
} from "../../lib/queries.js";

/* ── Constants ─────────────────────────────────────────────────────────── */
const DAY_SHORT  = ["Du","Se","Chor","Pay","Ju","Sha","Yak"]; // 0=Mon (matches DB convention)
const UZ_MONTHS  = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const ATT_COLOR: Record<string,string> = { p:"#22c55e", l:"#f59e0b", a:"#ef4444" };
const ATT_MARK:  Record<string,string> = { p:"✓", l:"—", a:"✕" };
const ATT_LABEL: Record<string,string> = { p:"Keldi", l:"Kechikdi", a:"Kelmadi" };


/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDueDate(due: string | null): string {
  if (!due) return "";
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(due); d.setHours(0,0,0,0);
  const diff = Math.round((d.getTime()-today.getTime())/86400000);
  if (diff===0) return "Bugun";
  if (diff===1) return "Ertaga";
  if (diff<0) return `${Math.abs(diff)} kun oldin`;
  return due;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}

function getWeekRange(): string {
  const today = new Date();
  const mon = new Date(today); mon.setDate(today.getDate()-((today.getDay()+6)%7));
  const sat = new Date(mon); sat.setDate(mon.getDate()+5);
  return `${mon.getDate()}-${sat.getDate()} ${UZ_MONTHS[sat.getMonth()]} ${sat.getFullYear()}`;
}

function addMins(t: string, mins: number): string {
  const [h,m] = t.split(":").map(Number);
  const tot = h*60+m+mins;
  return `${String(Math.floor(tot/60)).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;
}

function getDateForDay(dow: number): Date {
  const today = new Date();
  const d = new Date(today); d.setDate(today.getDate()+((dow-(today.getDay()+6)%7+7)%7));
  return d;
}

function isLiveNow(t: string, dur=90): boolean {
  const now = new Date();
  const [h,m] = t.split(":").map(Number);
  const s = new Date(now); s.setHours(h,m,0,0);
  return now>=s && now<=new Date(s.getTime()+dur*60000);
}

function slotStatus(slot: ScheduleSlot): "live"|"done"|"upcoming" {
  const sd = getDateForDay(slot.dayOfWeek);
  const now = new Date();
  const t = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const s = new Date(sd.getFullYear(),sd.getMonth(),sd.getDate());
  if (s<t) return "done";
  if (s.getTime()===t.getTime()) {
    if (isLiveNow(slot.startTime)) return "live";
    const [h,m] = slot.startTime.split(":").map(Number);
    const st = new Date(now); st.setHours(h,m,0,0);
    if (now>st) return "done";
  }
  return "upcoming";
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function SHead({ icon, title, sub, right }: { icon:string; title:string; sub?:string; right?:ReactNode }) {
  return (
    <div style={{ padding:"14px 16px 12px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid var(--border)" }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:"rgba(255,255,255,.06)", display:"grid", placeItems:"center", fontSize:18 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:750, fontSize:14 }}>{title}</div>
        {sub && <div style={{ fontSize:11.5, color:"var(--text-faint)", marginTop:2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}


/* ── Page ───────────────────────────────────────────────────────────────── */
export default function LessonsPage() {
  const { data: nextRaw }       = useNextLesson();
  const { data: scheduleRaw }   = useSchedule();
  const { data: attendanceRaw } = useAttendanceHistory();
  const { data: homeworkRaw }   = useHomework();
  const { data: packages = [] } = useMyPackages();
  const completeHW              = useCompleteHomework();

  const activePkg = packages.find((p) => p.status === "active");
  const remainingLessons = activePkg ? activePkg.totalLessons - activePkg.usedLessons : null;
  const creditPct = activePkg ? Math.round(((activePkg.totalLessons - activePkg.usedLessons) / activePkg.totalLessons) * 100) : 0;
  const [tick, setTick]         = useState(0);

  useEffect(() => { const t=setInterval(()=>setTick(v=>v+1),1000); return ()=>clearInterval(t); }, []);

  const next       = nextRaw ?? null;
  const schedule   = scheduleRaw ?? [];
  const attendance = attendanceRaw ?? null;
  const homework   = homeworkRaw ?? [];

  const countdown = useMemo(() => {
    if (!next) return { h:0, m:0, s:0 };
    const diff = Math.max(0, new Date(next.nextAt).getTime()-Date.now());
    return { h:Math.floor(diff/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, next?.nextAt]);

  async function handleComplete(id:string, xp:number) {
    const res = await completeHW.mutateAsync(id);
    if (!res.alreadyCompleted) showXp(res.xpAwarded??xp, "Uy vazifasi bajarildi!");
  }

  const [attPopover, setAttPopover] = useState<{date:string;status:string;note?:string|null}|null>(null);

  const doneHWCount = homework.filter(h=>h.done).length;
  const isToday     = next ? new Date(next.nextAt).toDateString()===new Date().toDateString() : false;
  const todayDow = (new Date().getDay()+6)%7;
  const sortedSched = [...schedule].sort((a,b)=>((a.dayOfWeek-todayDow+7)%7)-((b.dayOfWeek-todayDow+7)%7));

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {next ? (
        <div style={{
          background:"linear-gradient(135deg,#1565c0 0%,#1976d2 60%,#1e88e5 100%)",
          borderRadius:20, padding:"26px 28px", marginBottom:"var(--gap)",
          display:"flex", gap:24, alignItems:"center",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute",right:-60,top:-60,width:280,height:280,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",right:160,bottom:-80,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none" }}/>

          {/* Left */}
          <div style={{ flex:1, minWidth:0 }}>
            {/* Pills */}
            <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" }}>
              {next.isOnline && (
                <span style={{ background:"rgba(255,255,255,.18)",borderRadius:99,padding:"4px 12px",fontSize:12,fontWeight:600,color:"#fff",display:"inline-flex",alignItems:"center",gap:5 }}>
                  📹 Zoom orqali
                </span>
              )}
              <span style={{ background:"rgba(239,68,68,.3)",borderRadius:99,padding:"4px 12px",fontSize:12,fontWeight:600,color:"#fff",display:"inline-flex",alignItems:"center",gap:5 }}>
                🔴 {isToday?"Bugun":DAY_SHORT[next.dayOfWeek]} · {next.startTime.slice(0,5)}
              </span>
              <span style={{ background:"rgba(255,255,255,.18)",borderRadius:99,padding:"4px 12px",fontSize:12,fontWeight:600,color:"#fff",display:"inline-flex",alignItems:"center",gap:5 }}>
                🎓 {next.groupName.split(" ")[0]}
              </span>
            </div>

            {/* Title */}
            <h2 style={{ fontSize:24,fontWeight:900,color:"#fff",margin:"0 0 20px",lineHeight:1.2 }}>
              {next.groupName}
            </h2>

            {/* Countdown */}
            <div style={{ display:"flex",alignItems:"flex-end",gap:6,marginBottom:24 }}>
              {([{v:countdown.h,l:"SOAT"},null,{v:countdown.m,l:"DAQIQA"},null,{v:countdown.s,l:"SONIYA"}] as ({v:number;l:string}|null)[]).map((item,i)=>
                item===null
                  ? <div key={i} style={{ fontSize:26,fontWeight:900,color:"rgba(255,255,255,.6)",paddingBottom:22,lineHeight:1 }}>:</div>
                  : <div key={i} style={{ textAlign:"center" }}>
                      <div style={{ background:"rgba(0,0,0,.28)",borderRadius:12,padding:"10px 14px",minWidth:58 }}>
                        <div style={{ fontSize:28,fontWeight:900,color:"#fff",fontVariantNumeric:"tabular-nums",lineHeight:1 }}>
                          {String(item.v).padStart(2,"0")}
                        </div>
                      </div>
                      <div style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,.55)",marginTop:5,letterSpacing:.5 }}>{item.l}</div>
                    </div>
              )}
              <span style={{ fontSize:13,color:"rgba(255,255,255,.65)",marginLeft:6,paddingBottom:22 }}>qoldi</span>
            </div>

            {/* Buttons */}
            <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
              {next.meetingUrl && next.meetingUrl!=="null" ? (
                <a href={next.meetingUrl} target="_blank" rel="noreferrer" className="btn"
                  style={{ background:"#0d47a1",border:"1px solid rgba(255,255,255,.3)",color:"#fff",gap:6 }}>
                  📹 Zoom ga kirish
                </a>
              ) : (
                <button className="btn" style={{ background:"#0d47a1",border:"1px solid rgba(255,255,255,.3)",color:"#fff",gap:6 }} disabled>
                  📹 Zoom ga kirish
                </button>
              )}
            </div>
          </div>

          {/* Teacher card */}
          {next.teacherName && (
            <div style={{
              background:"rgba(0,0,0,.22)",backdropFilter:"blur(12px)",borderRadius:16,padding:20,
              minWidth:180,maxWidth:240,border:"1px solid rgba(255,255,255,.15)",flexShrink:0,position:"relative",zIndex:1,
            }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <Avatar name={next.teacherName} size="md" />
                <div>
                  <div style={{ fontWeight:800,fontSize:14.5,color:"#fff" }}>{next.teacherName}</div>
                  <div style={{ fontSize:11.5,color:"rgba(255,255,255,.55)",marginTop:2 }}>O'qituvchi</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background:"var(--surface-2)",border:"1.5px solid var(--border)",borderRadius:16,
          padding:"24px",marginBottom:"var(--gap)",textAlign:"center",color:"var(--text-faint)",fontSize:14,
        }}>
          📅 Kelgusi dars topilmadi — jadval admin tomonidan tuziladi
        </div>
      )}

      {/* ── 2-col grid ───────────────────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:"var(--gap)",alignItems:"start" }}>

        {/* LEFT: jadval + vazifalar */}
        <div style={{ display:"flex",flexDirection:"column",gap:"var(--gap)" }}>

          {/* Haftalik jadval */}
          <Card>
            <SHead icon="📅" title="Haftalik jadval" sub={getWeekRange()}
              right={<span className="badge ok" style={{ fontSize:11 }}>{schedule.length} dars/hafta</span>} />
            <div style={{ paddingBottom:6 }}>
              {sortedSched.length === 0 && (
                <div style={{ padding:"18px 16px",color:"var(--text-faint)",fontSize:13 }}>
                  Jadval hali tuzilmagan
                </div>
              )}
              {sortedSched.map(slot=>{
                const st = slotStatus(slot);
                const sd = getDateForDay(slot.dayOfWeek);
                const dotClr = st==="live"?"#ef4444":st==="done"?"#6b7280":"var(--kacc,#3F8CFF)";
                const teacherShort = slot.teacherName
                  ? `${slot.teacherName.split(" ")[0]} ${(slot.teacherName.split(" ")[1]??"").charAt(0)}.`
                  : "";
                return (
                  <div key={slot.id} style={{ display:"flex",alignItems:"center",gap:13,padding:"11px 16px",borderBottom:"1px solid var(--border)",opacity:st==="done"?.55:1 }}>
                    <div style={{ width:9,height:9,borderRadius:"50%",background:dotClr,flexShrink:0 }} />
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:13.5 }}>{slot.groupName}</div>
                      <div style={{ fontSize:11.5,color:"var(--text-faint)",marginTop:2 }}>
                        {DAY_SHORT[slot.dayOfWeek]} {String(sd.getDate()).padStart(2,"0")}.{String(sd.getMonth()+1).padStart(2,"0")} · {slot.startTime.slice(0,5)}–{addMins(slot.startTime,90)}{teacherShort?` · ${teacherShort}`:""}
                      </div>
                    </div>
                    {st==="live"     && <span className="badge dang" style={{ fontSize:11,display:"flex",alignItems:"center",gap:4 }}><span style={{ width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"inline-block" }}/> LIVE</span>}
                    {st==="done"     && <span className="badge ok"   style={{ fontSize:11 }}>✓ Bo'ldi</span>}
                    {st==="upcoming" && <span className="badge" style={{ fontSize:11,background:"rgba(255,255,255,.06)",color:"var(--text-faint)",border:"1px solid var(--border)" }}>Kutilmoqda</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Uy vazifalari */}
          <Card>
            <SHead icon="📋" title="Uy vazifalari" sub="Belgilab boring"
              right={<span className="badge ok" style={{ fontSize:11 }}>{doneHWCount}/{homework.length}</span>} />
            <div>
              {homework.length === 0 && (
                <div style={{ padding:"18px 16px",color:"var(--text-faint)",fontSize:13 }}>
                  Hali uy vazifasi yo'q
                </div>
              )}
              {homework.map(hw=>(
                <div key={hw.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:"1px solid var(--border)" }}>
                  <div
                    onClick={()=>!hw.done&&handleComplete(hw.id,hw.xpReward)}
                    style={{ width:22,height:22,borderRadius:6,flexShrink:0,border:`2px solid ${hw.done?"#22c55e":"var(--border-strong,var(--border))"}`,background:hw.done?"#22c55e":"transparent",display:"grid",placeItems:"center",cursor:hw.done?"default":"pointer" }}
                  >
                    {hw.done&&<span style={{ color:"#fff",fontSize:13,fontWeight:900 }}>✓</span>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:650,fontSize:13,textDecoration:hw.done?"line-through":"none",color:hw.done?"var(--text-faint)":"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {hw.title}
                    </div>
                    <div style={{ fontSize:11.5,color:"var(--text-faint)",marginTop:2,display:"flex",alignItems:"center",gap:5 }}>
                      <span style={{ display:"inline-block",width:10,height:10,borderRadius:3,background:"var(--kacc,#3F8CFF)",flexShrink:0 }}/>
                      {hw.dueDate&&<>{fmtDueDate(hw.dueDate)} · </>}
                      <span style={{ color:"#f59e0b" }}>+{hw.xpReward} XP</span>
                    </div>
                  </div>
                  <span className={`badge ${hw.done?"ok":"dang"}`} style={{ fontSize:11,flexShrink:0 }}>
                    {hw.done?"✓ Bajarildi":"Qilinmagan"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: dars krediti + davomat */}
        <div style={{ display:"flex",flexDirection:"column",gap:"var(--gap)" }}>

          {/* Dars krediti */}
          <Card>
            <SHead icon="🎫" title="Dars krediti" sub={activePkg ? activePkg.packageName : "Aktiv paket yo'q"} />
            <div style={{ padding:"14px 16px 18px" }}>
              {activePkg ? (
                <>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12 }}>
                    <div>
                      <span style={{ fontSize:42,fontWeight:900,lineHeight:1,color:creditPct>30?"var(--kacc,#3F8CFF)":"#ef4444" }}>
                        {remainingLessons}
                      </span>
                      <span style={{ fontSize:14,color:"var(--text-faint)",marginLeft:7 }}>dars qoldi</span>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:12,color:"var(--text-faint)" }}>Jami</div>
                      <div style={{ fontSize:18,fontWeight:800 }}>{activePkg.totalLessons}</div>
                    </div>
                  </div>
                  <div style={{ height:12,borderRadius:99,background:"rgba(255,255,255,.08)",overflow:"hidden",marginBottom:10 }}>
                    <div style={{
                      height:"100%",borderRadius:99,transition:"width 0.7s ease",
                      width:`${creditPct}%`,
                      background:creditPct>30?"linear-gradient(90deg,var(--kacc,#3F8CFF),#60a5fa)":"linear-gradient(90deg,#ef4444,#f87171)",
                    }}/>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-faint)" }}>
                    <span>{activePkg.usedLessons} dars ishlatildi</span>
                    <span style={{ color:creditPct>30?"var(--kacc,#3F8CFF)":"#ef4444",fontWeight:700 }}>{creditPct}%</span>
                  </div>
                  {creditPct<=30 && (
                    <div style={{ marginTop:12,padding:"10px 13px",borderRadius:10,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",fontSize:12,color:"#f87171" }}>
                      ⚠ Dars krediti tugayapti. Admin bilan bog'laning.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign:"center",padding:"18px 0",color:"var(--text-faint)" }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>🎫</div>
                  <div style={{ fontSize:13,fontWeight:600 }}>Aktiv paket topilmadi</div>
                  <div style={{ fontSize:12,marginTop:4 }}>Admin orqali paket sotib oling</div>
                </div>
              )}
            </div>
          </Card>

          {/* Davomat tarixi */}
          <Card>
            <SHead icon="✅" title="Davomat tarixi" />
            <div style={{ padding:"0 16px 16px" }}>
              {!attendance ? (
                <div style={{ padding:"18px 0",color:"var(--text-faint)",fontSize:13,textAlign:"center" }}>
                  Davomat ma'lumotlari yuklanmoqda...
                </div>
              ) : attendance.records.length === 0 ? (
                <div style={{ padding:"18px 0",color:"var(--text-faint)",fontSize:13,textAlign:"center" }}>
                  Hali davomat qayd etilmagan
                </div>
              ) : (
                <>
                  <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:14,position:"relative" }}
                    onClick={e=>{ if((e.target as HTMLElement).dataset.attIdx===undefined) setAttPopover(null); }}>
                    {attendance.records.map((r,i)=>{
                      const isActive = attPopover?.date===r.date;
                      return (
                        <div key={i}
                          data-att-idx={i}
                          onClick={e=>{ e.stopPropagation(); setAttPopover(isActive?null:{date:r.date,status:r.status,note:(r as any).note}); }}
                          style={{ width:30,height:30,borderRadius:7,background:ATT_COLOR[r.status]??"#475569",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:800,cursor:"pointer",outline:isActive?"2px solid #fff":"none",outlineOffset:1 }}>
                          {ATT_MARK[r.status]}
                        </div>
                      );
                    })}
                  </div>
                  {attPopover && (
                    <div style={{ marginBottom:12,background:"var(--kb2,rgba(255,255,255,.06))",border:`1px solid ${ATT_COLOR[attPopover.status]??"#475569"}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:12 }}>
                      <div style={{ width:10,height:10,borderRadius:"50%",background:ATT_COLOR[attPopover.status]??"#475569",flexShrink:0 }}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:700,fontSize:13 }}>
                          {(()=>{ const d=new Date(attPopover.date); return `${DAY_SHORT[(d.getDay()+6)%7]}, ${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; })()}
                        </div>
                        {attPopover.note && <div style={{ fontSize:12,color:"var(--text-faint)",marginTop:2 }}>{attPopover.note}</div>}
                      </div>
                      <span style={{ fontSize:12,fontWeight:700,color:ATT_COLOR[attPopover.status]??"#fff",flexShrink:0 }}>
                        {ATT_LABEL[attPopover.status]}
                      </span>
                    </div>
                  )}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14 }}>
                    {[
                      { v:attendance.totals.p, l:"Keldi",    bg:"rgba(34,197,94,.12)",  clr:"#22c55e" },
                      { v:attendance.totals.l, l:"Kechikdi", bg:"rgba(245,158,11,.12)", clr:"#f59e0b" },
                      { v:attendance.totals.a, l:"Kelmadi",  bg:"rgba(239,68,68,.12)",  clr:"#ef4444" },
                    ].map(s=>(
                      <div key={s.l} style={{ background:s.bg,border:"1px solid var(--border)",borderRadius:10,padding:"10px 8px",textAlign:"center" }}>
                        <div style={{ fontSize:22,fontWeight:900,color:s.clr }}>{s.v}</div>
                        <div style={{ fontSize:11,color:"var(--text-faint)",marginTop:2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:12.5 }}>
                    <span style={{ color:"var(--text-faint)" }}>Umumiy davomat</span>
                    <b style={{ color:"#22c55e" }}>{attendance.percent}%</b>
                  </div>
                  <div className="pbar flat"><span style={{ width:`${attendance.percent}%`,background:"#22c55e" }}/></div>
                </>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
