-- To'lov (qarzdorlik / paket muddati) eslatmalarini kuzatib boradi.
-- "debt" — darslari tugagan, yangi paket olinmagan holat; har 5 kunda takrorlanadi
--   (student_package_id NULL, gap tekshiruvi kod tomonda).
-- "expiring" — muddati yaqinlashgan aniq paket uchun bir martalik eslatma.
CREATE TABLE telegram_payment_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- debt | expiring
  student_package_id UUID REFERENCES student_packages(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX telegram_payment_reminders_expiring_uq
  ON telegram_payment_reminders_sent (student_id, student_package_id)
  WHERE kind = 'expiring';
