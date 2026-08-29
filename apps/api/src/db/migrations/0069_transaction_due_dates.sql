-- To'lov (tranzaksiya) muddati — "Kutilmoqda" da necha kun qolganini va
-- muddat o'tib ketganda "Qarzdor" holatini hisoblash uchun. Status jadvalda
-- o'zgarmaydi ("pending" bo'lib qoladi) — muddati o'tganini API darajasida
-- (due_date < CURRENT_DATE) hisoblab chiqaramiz, cron shart emas.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date) WHERE status = 'pending';

-- Mavjud tranzaksiyalarga, agar ular paketga bog'langan bo'lsa, paket
-- muddatidan orqaga to'ldirib qo'yamiz.
UPDATE transactions t
SET due_date = sp.expires_at
FROM student_packages sp
WHERE t.student_package_id = sp.id AND sp.expires_at IS NOT NULL AND t.due_date IS NULL;
