-- transactions.due_date endi FAQAT bitta ma'noni bildiradi: TO'LOV muddati —
-- pul qachongacha kelishi kerak ("keyinroq to'layman" deb va'da qilingan sana).
--
-- Paket (obuna) muddati esa faqat student_packages.expires_at da yashaydi va
-- hech qayerga nusxalanmaydi — 0069 da nusxalangan edi, natijada paket muddati
-- o'zgartirilganda tranzaksiyadagi nusxa eskirib qolar va "qolgan kunlar"
-- noto'g'ri chiqardi.
--
-- To'langan to'lovlarda due_date shunchaki paket muddatining nusxasi edi —
-- to'lov muddati sifatida ma'nosiz, shuning uchun tozalanadi.
UPDATE transactions SET due_date = NULL WHERE status = 'paid';

-- Endi indeks ham faqat o'z vazifasini bajaradi: to'lanmagan to'lovlar ichidan
-- muddati o'tganlarini (qarzdorlarni) tez topish.
DROP INDEX IF EXISTS idx_transactions_due_date;
CREATE INDEX IF NOT EXISTS idx_transactions_payment_due
  ON transactions(tenant_id, due_date) WHERE status = 'pending';

-- Paket muddati bo'yicha JOIN/filtr uchun (obuna tugash eslatmalari).
CREATE INDEX IF NOT EXISTS idx_student_packages_expires
  ON student_packages(expires_at) WHERE status = 'active';
