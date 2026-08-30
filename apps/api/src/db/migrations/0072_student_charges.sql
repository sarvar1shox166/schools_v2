-- MAJBURIYAT (charge) va PUL HARAKATI (transaction) ni ajratish.
--
-- Ilgari bitta transactions qatori ikkalasini ham bildirar edi, shuning uchun:
--   * qisman to'lov ("yarmini hozir, yarmini keyin") yozib bo'lmasdi;
--   * paketsiz to'lov (qarzni yopish) qabul qilib bo'lmasdi;
--   * to'lovni o'chirish paketni yetim qoldirardi.
--
-- Endi bog'liqlik zanjiri aniq:
--   students ─< student_charges ─< transactions
--                    └─> student_packages (ixtiyoriy)
-- Qarz SAQLANMAYDI, hisoblanadi: charge.amount − to'langan to'lovlar yig'indisi.
CREATE TABLE student_charges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- Paket sotib olish bo'lsa — bog'lanadi; "qarzni yopish" kabi holatlarda NULL.
  student_package_id UUID REFERENCES student_packages(id) ON DELETE CASCADE,
  amount             NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  -- TO'LOV muddati (pul qachongacha kelishi kerak). Paket muddati emas.
  due_date           DATE,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_charges_student ON student_charges(student_id);
CREATE INDEX idx_student_charges_tenant_due ON student_charges(tenant_id, due_date);
-- Bitta paketga bittadan ortiq majburiyat bo'lmasligi kerak.
CREATE UNIQUE INDEX idx_student_charges_package
  ON student_charges(student_package_id) WHERE student_package_id IS NOT NULL;

-- Tranzaksiya endi majburiyatga to'lov. Majburiyat o'chirilsa to'lovlari ham ketadi.
ALTER TABLE transactions
  ADD COLUMN charge_id UUID REFERENCES student_charges(id) ON DELETE CASCADE;
CREATE INDEX idx_transactions_charge ON transactions(charge_id);

-- ── Backfill ───────────────────────────────────────────────────────────────
-- 1) Paketga bog'langan to'lovlar: har paketga bitta majburiyat.
INSERT INTO student_charges (tenant_id, student_id, student_package_id, amount, due_date, created_at)
SELECT DISTINCT ON (t.student_package_id)
       t.tenant_id, t.student_id, t.student_package_id, t.amount, t.due_date, t.created_at
FROM transactions t
WHERE t.student_package_id IS NOT NULL
ORDER BY t.student_package_id, t.created_at;

UPDATE transactions t SET charge_id = c.id
FROM student_charges c
WHERE c.student_package_id = t.student_package_id AND t.student_package_id IS NOT NULL;

-- 2) Paketsiz to'lovlar: har biriga alohida majburiyat.
DO $$
DECLARE r RECORD; new_id UUID;
BEGIN
  FOR r IN SELECT id, tenant_id, student_id, amount, due_date, created_at
           FROM transactions WHERE charge_id IS NULL
  LOOP
    INSERT INTO student_charges (tenant_id, student_id, amount, due_date, created_at)
    VALUES (r.tenant_id, r.student_id, r.amount, r.due_date, r.created_at)
    RETURNING id INTO new_id;
    UPDATE transactions SET charge_id = new_id WHERE id = r.id;
  END LOOP;
END $$;

-- ── Qarz hisoblanadigan ko'rinish ──────────────────────────────────────────
CREATE VIEW charge_balance AS
SELECT
  c.id                 AS charge_id,
  c.tenant_id,
  c.student_id,
  c.student_package_id,
  c.amount,
  c.due_date,
  c.note,
  c.created_at,
  COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'paid'), 0)              AS paid,
  c.amount - COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'paid'), 0)   AS balance,
  CASE
    -- To'liq to'langan (ortiqcha to'lov ham shu yerga tushadi).
    WHEN c.amount - COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'paid'), 0) <= 0
      THEN 'paid'
    -- Qarzi bor VA muddati o'tgan — haqiqiy QARZDOR (qisman to'lagan bo'lsa ham).
    WHEN c.due_date IS NOT NULL AND c.due_date < CURRENT_DATE
      THEN 'overdue'
    -- Bir qismi kelgan, qolgani kutilmoqda.
    WHEN COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'paid'), 0) > 0
      THEN 'partial'
    -- Umuman kelmagan, muddati hali o'tmagan.
    ELSE 'deferred'
  END AS status
FROM student_charges c
LEFT JOIN transactions t ON t.charge_id = c.id
GROUP BY c.id;
