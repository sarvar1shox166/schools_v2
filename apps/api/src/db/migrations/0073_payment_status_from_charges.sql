-- O'quvchi to'lov holati endi majburiyat qoldig'idan (charge_balance) kelib chiqadi —
-- To'lovlar sahifasi bilan bir xil manba, shuning uchun ikki sahifa hech qachon
-- bir-biriga zid natija ko'rsatmaydi.
--
-- 'debt'      — muddati o'tgan, to'liq to'lanmagan majburiyat bor (qisman to'lagan ham).
-- 'active'    — qarzi yo'q, ishlatsa bo'ladigan paketi bor.
-- 'expired'   — qarzi yo'q, lekin paketi tugagan/muddati o'tgan (yangilash kerak).
-- 'inactive'  — paketlari bor, lekin faoli yo'q.
-- 'no_package'— hech qachon paket olmagan.
CREATE OR REPLACE VIEW student_payment_status AS
SELECT
  s.id AS student_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM charge_balance cb
      WHERE cb.student_id = s.id AND cb.status = 'overdue'
    ) THEN 'debt'
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
        AND (sp.expires_at IS NULL OR sp.expires_at >= CURRENT_DATE)
        AND sp.used_lessons < sp.total_lessons
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
    ) THEN 'expired'
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
