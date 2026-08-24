"use client";

import { useLeadCapture } from "./LeadCaptureContext";

export function LeadCtaButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = useLeadCapture();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
