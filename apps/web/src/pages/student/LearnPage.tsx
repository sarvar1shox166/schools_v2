import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLearnTopics, type LearnCategory, type LearnTopic } from "../../lib/queries.js";

const CARD_BG = "#111114";
const CARD_BORDER = "#1e1e22";

const CATEGORY_TABS: { v: LearnCategory; label: string; emoji: string; color: string; desc: string }[] = [
  { v: "piece", label: "Shaxmat donalari", emoji: "♟️", color: "#8b5cf6", desc: "Har bir dona qanday yurishini o'rganing — 10 bosqichda, avtomatik yangilanadigan mashqlar bilan." },
  { v: "principle", label: "Asosiy prinsiplar", emoji: "🧠", color: "#f59e0b", desc: "Kuchli o'yinchidek o'ylang: urib olish, himoya, shoh berish va mat berish." },
  { v: "intermediate", label: "O'rta daraja", emoji: "🎯", color: "#3b82f6", desc: "Rokirovka, en passant, pat va o'yin boshlanishi qoidalari." },
  { v: "advanced", label: "Yuqori daraja", emoji: "🏆", color: "#ec4899", desc: "Donalar qiymati va shoh berish uchun taktik yurishlar." },
];

function TopicCard({ topic, color }: { topic: LearnTopic; color: string }) {
  const navigate = useNavigate();
  const total = topic.totalLevels ?? 0;
  const pct = total > 0 ? (topic.bestLevel / total) * 100 : 0;
  const started = topic.bestLevel > 0;
  const done = total > 0 && topic.bestLevel >= total;
  const [hover, setHover] = useState(false);

  const total0 = topic.totalLevels ?? 1;
  const nextLevel = Math.min(topic.bestLevel + 1, total0) || 1;

  return (
    <div
      onClick={() => navigate(`/student/learn/${topic.id}/${nextLevel}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px", borderRadius: 16, cursor: "pointer", transition: "all .15s",
        background: started ? `linear-gradient(135deg,${color}24,${CARD_BG})` : CARD_BG,
        border: `1.5px solid ${started ? color + "55" : hover ? "#2f2f36" : CARD_BORDER}`,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
        background: started ? `${color}33` : "#18181c",
      }}>
        {topic.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", color: started ? color : "#f5f5f6" }}>
          {topic.title}
        </div>
        <div style={{ fontSize: 13, color: "#8b8d98", fontWeight: 500, marginTop: 3 }}>{topic.subtitle}</div>
        {started && (
          <div style={{ height: 3, background: `${color}33`, borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
          </div>
        )}
      </div>
      {done ? (
        <div style={{ alignSelf: "flex-start", color: "#4ade80", fontSize: 18, flexShrink: 0 }}>✓</div>
      ) : started ? (
        <div style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", flexShrink: 0 }}>
          {topic.bestLevel}/{total}
        </div>
      ) : null}
    </div>
  );
}

export default function LearnPage() {
  const [tab, setTab] = useState<LearnCategory>("piece");
  const { data: topics = [], isLoading } = useLearnTopics(tab);
  const active = CATEGORY_TABS.find((t) => t.v === tab)!;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {CATEGORY_TABS.map((t) => {
          const on = tab === t.v;
          return (
            <div key={t.v} onClick={() => setTab(t.v)}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "11px 20px 11px 12px", borderRadius: 14,
                fontSize: 14.5, fontWeight: 800, cursor: "pointer", transition: "all .15s",
                background: on ? t.color : CARD_BG,
                border: on ? "none" : `1px solid ${CARD_BORDER}`,
                color: on ? "#fff" : "#c7c8d0",
                boxShadow: on ? `0 6px 18px ${t.color}44` : undefined,
              }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, background: on ? "rgba(255,255,255,.2)" : "#18181c",
              }}>
                {t.emoji}
              </div>
              {t.label}
            </div>
          );
        })}
      </div>

      <div style={{
        fontSize: 13, color: "#8b8d98", lineHeight: 1.5, marginBottom: 20, fontWeight: 500,
        padding: "10px 14px", borderRadius: 12, background: `${active.color}14`, border: `1px solid ${active.color}2a`,
      }}>
        {active.desc}
      </div>

      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.42em", color: "#5a5b64", margin: "2px 0 14px" }}>
        {active.label.toUpperCase()}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)" }}>Yuklanmoqda...</div>
      ) : (
        <div className="grid cols-2" style={{ gap: 12 }}>
          {topics.map((topic) => <TopicCard key={topic.id} topic={topic} color={active.color} />)}
        </div>
      )}
    </div>
  );
}
