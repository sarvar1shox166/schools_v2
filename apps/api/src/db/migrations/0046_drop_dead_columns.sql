-- groups.lesson_type — konsepsiya keyinchalik schedule_slots.lesson_type'ga ko'chirilgan
-- (boshqa qiymat yozilishi bilan: 'group'/'individual'/'diagnostic' -> 'guruh'/'individual'/'diagnostika').
-- Ilova kodida hech qayerda o'qilmaydi (tekshirildi).
ALTER TABLE groups DROP COLUMN IF EXISTS lesson_type;
