-- O'quvchi to'lov statusi endi (mavjud bo'lsa) paket MUDDATIGA (expires_at)
-- qarab hisoblanadi: muddat tugamagan bo'lsa "active" (Kutilmoqda), tugagan
-- bo'lsa "debt" (Qarzdor) — dars sonidan qat'i nazar. expires_at ko'rsatilmagan
-- (eski/muddatsiz) paketlar uchun avvalgi dars-soni mantig'i saqlanib qoladi.
CREATE OR REPLACE VIEW student_payment_status AS
SELECT
  s.id AS student_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
        AND (
          (sp.expires_at IS NOT NULL AND sp.expires_at >= CURRENT_DATE)
          OR (sp.expires_at IS NULL AND sp.used_lessons < sp.total_lessons)
        )
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
        AND (
          (sp.expires_at IS NOT NULL AND sp.expires_at < CURRENT_DATE)
          OR (sp.expires_at IS NULL AND sp.used_lessons >= sp.total_lessons)
        )
    ) THEN 'debt'
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp WHERE sp.student_id = s.id
    ) THEN 'inactive'
    ELSE 'no_package'
  END AS payment_status,
  (
    SELECT sp.expires_at FROM student_packages sp
    WHERE sp.student_id = s.id AND sp.status = 'active'
    ORDER BY sp.purchased_at DESC LIMIT 1
  ) AS active_package_expires
FROM students s;
