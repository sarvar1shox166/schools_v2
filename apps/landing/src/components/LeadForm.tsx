"use client";

import { useId, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { submitLead, LeadSubmitError } from "../lib/leads";
import { ageOptions, dayOptions } from "../data/content";
import styles from "./LeadForm.module.css";

export function LeadForm({ onClose, resetLabel = "Yana ariza qoldirish" }: { onClose?: () => void; resetLabel?: string }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [preferredDays, setPreferredDays] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formId = useId();

  function reset() {
    setFullName(""); setPhone(""); setAgeRange(""); setPreferredDays(""); setError(""); setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !ageRange) {
      setError("Iltimos, ism, telefon va bola yoshini to'ldiring.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await submitLead({
        fullName: fullName.trim(),
        phone: phone.trim(),
        ageRange,
        preferredDays: preferredDays || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof LeadSubmitError ? err.message : "Kutilmagan xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.successWrap}>
        <span className={styles.successIcon}><CheckCircle2 size={32} color="#16A34A" aria-hidden="true" /></span>
        <h3 className={styles.successTitle}>Rahmat, {fullName.trim()}!</h3>
        <p className={styles.successText}>Arizangiz qabul qilindi. Murabbiyimiz 24 soat ichida bog&apos;lanadi.</p>
        <button type="button" className={styles.successBtn} onClick={onClose ?? reset}>
          {onClose ? "Yopish" : resetLabel}
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-name`}>Ota-onaning ismi</label>
        <input id={`${formId}-name`} className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ismingiz" autoComplete="name" required />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${formId}-phone`}>Telefon raqami</label>
        <input id={`${formId}-phone`} className={styles.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 __ ___ __ __" autoComplete="tel" required />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-age`}>Bola yoshi</label>
          <select id={`${formId}-age`} className={styles.input} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} required>
            <option value="">Tanlang</option>
            {ageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-days`}>Qulay kunlar</label>
          <select id={`${formId}-days`} className={styles.input} value={preferredDays} onChange={(e) => setPreferredDays(e.target.value)}>
            <option value="">Tanlang</option>
            {dayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </div>
      )}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish (Bepul)"}
      </button>
      <p className={styles.privacy}>Ma&apos;lumotlaringiz maxfiy saqlanadi.</p>
    </form>
  );
}
