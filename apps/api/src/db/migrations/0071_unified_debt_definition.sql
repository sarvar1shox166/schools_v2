-- Butun tizimda "qarzdor" ning BITTA ta'rifi bo'lishi uchun.
--
-- Ilgari ikki xil ta'rif bor edi: To'lovlar sahifasi transactions.due_date
-- bo'yicha, O'quvchilar sahifasi esa shu view orqali paket muddati/darslar
-- soni bo'yicha hisoblardi. Natijada bitta o'quvchi bir sahifada qarzdor,
-- boshqasida qarzdor emas bo'lib ko'rinardi.
--
-- Endi qoida bitta: QARZ = pul kelmagan VA va'da qilingan to'lov muddati o'tgan.
-- To'lagan, lekin obunasi tugagan o'quvchi qarzdor emas — u 'expired'
-- (yangilash kerak) holatida bo'ladi.
CREATE OR REPLACE VIEW student_payment_status AS
SELECT
  s.id AS student_id,
  CASE
    -- HAQIQIY QARZ: to'lanmagan to'lov, muddati o'tib ketgan.
    WHEN EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.student_id = s.id AND t.status = 'pending'
        AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE
    ) THEN 'debt'
    -- Ishlatsa bo'ladigan faol paket bor.
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
        AND (sp.expires_at IS NULL OR sp.expires_at >= CURRENT_DATE)
        AND sp.used_lessons < sp.total_lessons
    ) THEN 'active'
    -- Paketi bor, lekin muddati o'tgan yoki darslari tugagan — qarz emas,
    -- shunchaki yangilash kerak.
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
