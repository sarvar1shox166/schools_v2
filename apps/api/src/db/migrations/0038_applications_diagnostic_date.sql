-- Diagnostika bir martalik voqea — endi aniq sana saqlanadi, hafta kuni faqat
-- (schedule_slots.day_of_week NOT NULL bo'lgani uchun) shu sanadan hisoblab olinadi.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS diagnostic_date DATE;

-- Eski qatorlarda (agar diagnostic_day_of_week to'ldirilgan bo'lsa) taxminiy sana
-- backfill qilinadi: bugundan boshlab shu hafta kuniga mos eng yaqin sana.
UPDATE applications
SET diagnostic_date = CURRENT_DATE +
  ((diagnostic_day_of_week - EXTRACT(ISODOW FROM CURRENT_DATE)::int + 1 + 7) % 7)
WHERE diagnostic_day_of_week IS NOT NULL AND diagnostic_date IS NULL;
