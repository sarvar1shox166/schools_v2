"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LeadModal } from "./LeadModal";

interface LeadCaptureState {
  open: () => void;
}

const LeadCaptureCtx = createContext<LeadCaptureState | null>(null);

/** Sahifa bo'ylab "Bepul dars" modalini ochish holatini boshqaradi — shu
 *  bilan Header, Hero va Signup bo'limlaridagi tugmalar bitta modalni
 *  baham ko'radi, har biri o'z holatini saqlamaydi. */
export function LeadCaptureProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <LeadCaptureCtx.Provider value={value}>
      {children}
      {isOpen && <LeadModal onClose={close} />}
    </LeadCaptureCtx.Provider>
  );
}

export function useLeadCapture(): LeadCaptureState {
  const ctx = useContext(LeadCaptureCtx);
  if (!ctx) throw new Error("useLeadCapture must be used within LeadCaptureProvider");
  return ctx;
}
