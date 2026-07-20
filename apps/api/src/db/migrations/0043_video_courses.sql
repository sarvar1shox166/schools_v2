-- Video darsliklar endi kurs (course) konteyneri ichida bir nechta video-darsdan iborat.
CREATE TABLE IF NOT EXISTS video_courses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id       UUID REFERENCES teachers(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('zoom','debyut','taktika','endshpil','strategiya')),
  thumbnail_url    TEXT,
  thumbnail_color  TEXT,
  thumbnail_icon   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE video_lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES video_courses(id) ON DELETE CASCADE;

-- Har bir mavjud video uchun alohida kurs yaratib, unga bog'laymiz (backfill).
DO $$
DECLARE r RECORD; new_course_id UUID;
BEGIN
  FOR r IN SELECT * FROM video_lessons WHERE course_id IS NULL LOOP
    INSERT INTO video_courses (tenant_id, teacher_id, title, category, thumbnail_url, thumbnail_color, thumbnail_icon, created_at)
    VALUES (r.tenant_id, r.teacher_id, r.title, r.category, r.thumbnail_url, r.thumbnail_color, r.thumbnail_icon, r.created_at)
    RETURNING id INTO new_course_id;
    UPDATE video_lessons SET course_id = new_course_id WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE video_lessons ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE video_lessons DROP COLUMN IF EXISTS category;
ALTER TABLE video_lessons DROP COLUMN IF EXISTS thumbnail_url;
ALTER TABLE video_lessons DROP COLUMN IF EXISTS thumbnail_color;
ALTER TABLE video_lessons DROP COLUMN IF EXISTS thumbnail_icon;
ALTER TABLE video_lessons DROP COLUMN IF EXISTS teacher_id;

CREATE INDEX IF NOT EXISTS idx_video_lessons_course_id ON video_lessons(course_id);
