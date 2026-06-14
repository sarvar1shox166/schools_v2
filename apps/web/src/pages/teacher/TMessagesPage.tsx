import { useState } from "react";
import { Avatar, Card, Icon, PageHead } from "@chess-school/ui";
import { useAuthStore } from "../../lib/auth-store.js";
import { haptic } from "../../lib/telegram.js";
import { useMessageThread, useMessageThreads, useSendMessage } from "../../lib/queries.js";

export default function TMessagesPage() {
  const { data: threads } = useMessageThreads();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages } = useMessageThread(activeId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const myUserId = useAuthStore((s) => s.user?.id);

  const active = threads?.find((t) => t.userId === activeId);

  function handleSend() {
    if (!activeId || !text.trim()) return;
    sendMessage.mutate({ recipientId: activeId, body: text.trim() });
    setText("");
    haptic("light");
  }

  return (
    <div>
      <PageHead title="Xabarlar" />
      <div className="grid l-1-2" style={{ alignItems: "stretch" }}>
        <Card className="fade-up">
          <div className="card-head"><div className="ttl">Suhbatlar</div></div>
          <div className="list">
            {threads?.map((t) => (
              <div
                key={t.userId}
                className="li"
                style={{ cursor: "pointer", background: t.userId === activeId ? "var(--hover)" : undefined }}
                onClick={() => setActiveId(t.userId)}
              >
                <Avatar name={t.fullName} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cell-main">{t.fullName}</div>
                  <div className="cell-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.lastBody ?? "Xabar yo'q"}</div>
                </div>
                {t.unreadCount > 0 && <span className="badge acc">{t.unreadCount}</span>}
              </div>
            ))}
            {(!threads || threads.length === 0) && (
              <div className="empty"><Icon name="message" size={28} /><div>Suhbatlar yo'q</div></div>
            )}
          </div>
        </Card>

        <Card className="fade-up" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-head"><div className="ttl">{active?.fullName ?? "Suhbatni tanlang"}</div></div>
          {activeId ? (
            <>
              <div style={{ flex: 1, padding: "16px", minHeight: 280, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                {messages?.map((m) => {
                  const out = m.senderId === myUserId;
                  return (
                    <div key={m.id} className={"msg-row" + (out ? " out" : "")}>
                      {!out && <Avatar name={active?.fullName ?? ""} size="sm" />}
                      <div>
                        <div className={"msg" + (out ? " out" : " in")}>{m.body}</div>
                        <div className="msg-time" style={{ textAlign: out ? "right" : "left", marginTop: 4 }}>
                          {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!messages || messages.length === 0) && (
                  <div className="empty"><Icon name="message" size={28} /><div>Xabarlar yo'q</div></div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, padding: 16, borderTop: "1px solid var(--border)" }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder="Xabar yozing..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button className="btn primary" onClick={handleSend} disabled={sendMessage.isPending}>
                  <Icon name="arrowRight" size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: 40 }}><Icon name="message" size={28} /><div>Chap tomondan suhbat tanlang</div></div>
          )}
        </Card>
      </div>
    </div>
  );
}
