"use client";

import { useEffect, useId, useRef } from "react";
import { X, Flame } from "lucide-react";
import { LeadForm } from "./LeadForm";
import styles from "./LeadModal.module.css";

export function LeadModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Yopish">
          <X size={18} aria-hidden="true" />
        </button>

        <div className={styles.badge}><Flame size={13} aria-hidden="true" /> Bepul sinov darsi</div>
        <h3 id={titleId} className={styles.title}>Bepul darsga yozilish</h3>
        <p className={styles.sub}>Bir daqiqada to&apos;ldiring — biz bog&apos;lanamiz.</p>

        <LeadForm onClose={onClose} />
      </div>
    </div>
  );
}
