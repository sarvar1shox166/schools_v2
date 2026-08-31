-- "Bugungi dars" sehrgari qayta yurgizilsa (masalan tarmoq xatosi tufayli
-- ikki marta yuborilsa), bir xil guruh/dars/sarlavha uchun ikkinchi marta
-- POST /homework yuborilganda yangi qator yaratilib ketardi. Natijada
-- homework_completions PK (student_id, homework_id) ikkala nusxani ham
-- alohida ruxsat berardi va o'quvchi bir xil vazifa uchun XP ni IKKI
-- MARTA olardi. Bu yerda DB darajasida UNIQUE indeks bilan oldini olamiz.

-- ── 1) Mavjud dublikatlarni xavfsiz birlashtirish (agar bo'lsa) ────────────
-- Har (group_id, schedule_slot_id, lesson_date, title) guruhi bo'yicha eng
-- ESKI qatorni "asosiy" deb belgilaymiz. Dublikatlardagi bajarilgan
-- (homework_completions) yozuvlarni asosiy qatorga ko'chiramiz — shu bilan
-- hech kimning bajargan uy vazifasi yo'qolmaydi (allaqachon bor bo'lsa,
-- ON CONFLICT DO NOTHING orqali e'tiborsiz qoldiriladi). Keyin dublikat
-- homework qatorlarini o'chiramiz (homework_completions CASCADE bilan
-- ketadi, lekin yuqorida ko'chirilgani saqlanib qoladi).
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY group_id, schedule_slot_id, lesson_date, lower(btrim(title))
      ORDER BY created_at, id
    ) AS primary_id
  FROM homework
  WHERE schedule_slot_id IS NOT NULL AND lesson_date IS NOT NULL
),
dupes AS (
  SELECT id, primary_id FROM ranked WHERE id <> primary_id
),
moved_completions AS (
  INSERT INTO homework_completions (student_id, homework_id, completed_at)
  SELECT hc.student_id, d.primary_id, hc.completed_at
  FROM homework_completions hc
  JOIN dupes d ON d.id = hc.homework_id
  ON CONFLICT DO NOTHING
  RETURNING 1
)
DELETE FROM homework h
USING dupes d
WHERE h.id = d.id;

-- ── 2) Dublikat yaratilishini DB darajasida taqiqlash ──────────────────────
-- Faqat aniq darsga bog'langan (schedule_slot_id + lesson_date bor) vazifalar
-- cheklanadi — sana/darsga bog'lanmagan eski yoki qo'lda yaratilgan
-- vazifalarga (schedule_slot_id yoki lesson_date NULL) bu cheklov tegmaydi,
-- chunki ular uchun "bir xillik" tushunchasi yo'q va admin/teacher bir xil
-- nomli bir nechta erkin vazifa yaratishi mumkin bo'lishi kerak.
CREATE UNIQUE INDEX uq_homework_slot_title
  ON homework (group_id, schedule_slot_id, lesson_date, lower(btrim(title)))
  WHERE schedule_slot_id IS NOT NULL AND lesson_date IS NOT NULL;
