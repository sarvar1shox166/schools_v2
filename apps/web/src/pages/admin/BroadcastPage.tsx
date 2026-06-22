import { useState } from "react";
import { Card, Icon } from "@chess-school/ui";
import { useBroadcastNotification } from "../../lib/queries.js";

type TargetRole = "all" | "student" | "teacher";
type Channel    = "push" | "sms" | "telegram";

const TARGET_ROLES: { key: TargetRole; label: string; icon: string }[] = [
  { key: "all",     label: "Hammaga",          icon: "users"   },
  { key: "student", label: "O'quvchilarga",    icon: "students" },
  { key: "teacher", label: "O'qituvchilarga",  icon: "teacher" },
];

const CHANNELS: { key: Channel; label: string; icon: string }[] = [
  { key: "push",     label: "Push bildirishnoma", icon: "bell"    },
  { key: "sms",      label: "SMS",                icon: "message" },
  { key: "telegram", label: "Telegram bot",       icon: "send"    },
];

type SentMsg = {
  id: string;
  title: string;
  audience: string;
  channel: string;
  date: string;
  reach: number;
};

const SENT_MSGS: SentMsg[] = [
  { id:"1", title:"Bayram tabrigi",          audience:"Barcha o'quvchilar", channel:"Telegram", date:"08.06.2026 09:00", reach:248 },
  { id:"2", title:"To'lov eslatmasi (Iyun)", audience:"Qarzdorlar",          channel:"SMS",      date:"05.06.2026 10:00", reach:14  },
  { id:"3", title:"Yangi turnir e'loni",     audience:"Ota-onalar",          channel:"Push",     date:"03.06.2026 18:00", reach:201 },
  { id:"4", title:"Dars jadvali o'zgardi",   audience:"Taktika — B guruh",   channel:"Telegram", date:"01.06.2026 12:00", reach:8   },
];

const CHANNEL_ICON: Record<string, string> = {
  Telegram: "send", SMS: "message", Push: "bell",
};

export default function BroadcastPage() {
  const [targetRole, setTargetRole] = useState<TargetRole>("all");
  const [channel,    setChannel]    = useState<Channel>("push");
  const [title,      setTitle]      = useState("");
  const [text,       setText]       = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const broadcastMut = useBroadcastNotification();

  function send() {
    if (!title.trim() || !text.trim()) return;
    setSuccessMsg(null);
    broadcastMut.mutate(
      { title: title.trim(), body: text.trim(), targetRole },
      {
        onSuccess: (data) => {
          setSuccessMsg(`${data.sent} ta foydalanuvchiga yuborildi`);
          setTitle("");
          setText("");
        },
      }
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

      {/* Header */}
      <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
        Ommaviy xabar yuborish
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "var(--gap)" }}>

        {/* Left: compose */}
        <Card style={{ padding: 0 }}>
          {/* Card head */}
          <div style={{ padding: "18px 22px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#dbeafe", color: "#2563eb",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="send" size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Yangi xabar</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 1 }}>Auditoriya va kanalni tanlang</div>
            </div>
          </div>

          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* KIMGA */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: "0.07em", marginBottom: 10 }}>
                KIMGA
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TARGET_ROLES.map(r => (
                  <button key={r.key} onClick={() => setTargetRole(r.key)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 18px", borderRadius: 12, cursor: "pointer",
                    border: targetRole === r.key ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: targetRole === r.key ? "var(--accent)1a" : "var(--surface-2)",
                    textAlign: "left",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: targetRole === r.key ? "var(--accent)" : "var(--surface-3,#e5e7eb)",
                      color: targetRole === r.key ? "#fff" : "var(--text-dim)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name={r.icon} size={14} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: targetRole === r.key ? "var(--accent)" : "var(--text)" }}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* KANAL */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: "0.07em", marginBottom: 10 }}>
                KANAL
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {CHANNELS.map(c => (
                  <button key={c.key} onClick={() => setChannel(c.key)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 16px", borderRadius: 99, cursor: "pointer",
                    border: channel === c.key ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: channel === c.key ? "var(--accent)1a" : "transparent",
                    color: channel === c.key ? "var(--accent)" : "var(--text-dim)",
                    fontWeight: 700, fontSize: 13,
                  }}>
                    <Icon name={c.icon} size={13} /> {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SARLAVHA */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: "0.07em", marginBottom: 10 }}>
                SARLAVHA
              </div>
              <input
                className="inp"
                placeholder="Xabar sarlavhasi..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13.5 }}
              />
            </div>

            {/* XABAR MATNI */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", letterSpacing: "0.07em", marginBottom: 10 }}>
                XABAR MATNI
              </div>
              <textarea
                className="inp"
                rows={5}
                placeholder="Xabaringizni yozing..."
                value={text}
                onChange={e => setText(e.target.value)}
                style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13.5 }}
              />
              <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
                {text.length} belgi
              </div>
            </div>

            {/* Success / Error feedback */}
            {successMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, background: "#dcfce7", color: "#15803d",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icon name="check" size={14} /> {successMsg}
              </div>
            )}
            {broadcastMut.isError && (
              <div style={{
                padding: "10px 14px", borderRadius: 10, background: "#fee2e2", color: "#dc2626",
                fontSize: 13, fontWeight: 600,
              }}>
                Xatolik yuz berdi. Qaytadan urinib ko'ring.
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="users" size={14} />
                {targetRole === "all" ? "Barcha foydalanuvchilar" : targetRole === "student" ? "O'quvchilar" : "O'qituvchilar"}
              </div>
              <button
                className="btn primary"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                disabled={!title.trim() || !text.trim() || broadcastMut.isPending}
                onClick={send}
              >
                {broadcastMut.isPending
                  ? <><Icon name="clock" size={13} /> Yuborilmoqda...</>
                  : <><Icon name="send" size={13} /> Yuborish</>
                }
              </button>
            </div>
          </div>
        </Card>

        {/* Right: sent history */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#dbeafe", color: "#2563eb",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="barChart" size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Yuborilgan xabarlar</div>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 1 }}>So'nggi tarix</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {SENT_MSGS.map((m, i) => (
              <div key={m.id} style={{
                padding: "16px 22px",
                borderBottom: i < SENT_MSGS.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: "var(--surface-2)",
                  color: "var(--text-dim)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={CHANNEL_ICON[m.channel] ?? "message"} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 750, fontSize: 14, marginBottom: 3 }}>{m.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                    {m.audience} · {m.channel}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {m.date} · {m.reach} kishi
                  </div>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 99, flexShrink: 0,
                  background: "#dcfce7", color: "#16a34a",
                  fontSize: 11.5, fontWeight: 700,
                }}>
                  <Icon name="check" size={10} /> yuborildi
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
