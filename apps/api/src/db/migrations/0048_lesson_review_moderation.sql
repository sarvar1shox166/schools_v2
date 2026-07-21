-- O'quvchi izohlari (comment) o'qituvchiga ko'rinishidan oldin moderatorlar tomonidan
-- tekshiriladi (havfli/nomaqbul bo'lsa olib tashlanadi). Raqamli baho (rating) bunga
-- kirmaydi — u darhol statistikaga qo'shiladi.
ALTER TABLE lesson_student_reviews
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- Izohsiz (comment yo'q) yozuvlarda moderatsiya qilinadigan narsa yo'q — darhol tasdiqlangan hisoblanadi.
UPDATE lesson_student_reviews SET moderation_status = 'approved' WHERE comment IS NULL;

-- Mavjud (migratsiyadan oldingi) izohlar allaqachon faqat adminga ko'rinar edi va hech
-- qanday muammo qayd etilmagan — orqaga qarab "kutilmoqda" holatiga tushib qolmasligi
-- uchun tasdiqlangan deb belgilanadi.
UPDATE lesson_student_reviews SET moderation_status = 'approved', moderated_at = created_at WHERE comment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_student_reviews_moderation ON lesson_student_reviews(moderation_status);
