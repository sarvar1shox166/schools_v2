-- Har bir video-darsning o'zi uchun alohida muqova (thumbnail) rasm — hozircha
-- faqat kurs darajasida bor edi.
ALTER TABLE video_lessons ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
