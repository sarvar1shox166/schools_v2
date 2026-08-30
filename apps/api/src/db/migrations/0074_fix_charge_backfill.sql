-- 0072 dagi backfill eski ma'lumotning ikkita holatini noto'g'ri o'girgan edi.
-- Toza bazada (har paketga bitta to'lov, bekor qilingani yo'q) bu sezilmaydi,
-- shuning uchun tuzatish alohida migratsiyada — 0072 tarixini o'zgartirmaymiz.

-- ── 1) Bo'lib to'langan paket ───────────────────────────────────────────────
-- Bitta paket ikki marta to'langan bo'lsa (masalan 225000 + 225000), backfill
-- majburiyat summasini faqat BIRINCHI to'lovdan olardi. Natijada to'langan
-- summa majburiyatdan katta bo'lib, qoldiq MANFIY chiqardi.
-- To'g'ri summa — o'sha paketga tegishli haqiqiy to'lovlar yig'indisi
-- (bekor qilingan/xatolari hisobga olinmaydi).
UPDATE student_charges c
SET amount = s.total
FROM (
  SELECT charge_id, SUM(amount) AS total
  FROM transactions
  WHERE charge_id IS NOT NULL AND status IN ('paid', 'pending')
  GROUP BY charge_id
  HAVING COUNT(*) > 1
) s
WHERE c.id = s.charge_id AND c.amount <> s.total;

-- ── 2) Bekor qilingan / xato to'lovlardan yasalgan "arvoh" majburiyatlar ───
-- Bekor qilingan yoki xato tranzaksiya — pul harakati emas, faqat tarix.
-- Backfill ularning har biriga majburiyat yaratib yuborgan edi, natijada
-- mavjud bo'lmagan qarz "kutilayotgan" summaga qo'shilib ketardi.
--
-- Faqat paketga bog'lanmagan va ichida BIRORTA ham haqiqiy (paid/pending)
-- to'lovi bo'lmagan majburiyatlar olib tashlanadi. Admin qo'lda yaratgan,
-- hali to'lovi yo'q majburiyatlarga tegilmaydi — ularda umuman tranzaksiya
-- bo'lmaydi, bu yerda esa kamida bitta (bekor qilingan) tranzaksiya bor.
CREATE TEMP TABLE phantom_charges AS
SELECT c.id
FROM student_charges c
WHERE c.student_package_id IS NULL
  AND EXISTS (
    SELECT 1 FROM transactions t WHERE t.charge_id = c.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.charge_id = c.id AND t.status IN ('paid', 'pending')
  );

-- Avval bog'lanish uziladi — aks holda CASCADE tranzaksiyani ham o'chirib
-- yuboradi, bekor qilingan to'lov tarixi esa saqlanishi kerak.
UPDATE transactions SET charge_id = NULL
WHERE charge_id IN (SELECT id FROM phantom_charges);

DELETE FROM student_charges WHERE id IN (SELECT id FROM phantom_charges);

DROP TABLE phantom_charges;
