-- Kurs sozlamalari: har bir darsni (video + testi) tugatgani uchun XP va butun
-- kursni (barcha darslar + yakuniy test) tugatgani uchun XP.
ALTER TABLE video_courses
  ADD COLUMN IF NOT EXISTS lesson_completion_xp INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS course_completion_xp INT NOT NULL DEFAULT 0;

-- Dars-tugatish XP'si faqat bir marta berilishi uchun belgi.
ALTER TABLE video_progress
  ADD COLUMN IF NOT EXISTS lesson_xp_awarded_at TIMESTAMPTZ;

-- Kurs oxiridagi yakuniy test savollari (video_quiz_questions bilan bir xil
-- shakl, lekin video emas, kursga bog'langan).
CREATE TABLE IF NOT EXISTS video_course_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES video_courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index SMALLINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_course_exam_questions_course ON video_course_exam_questions(course_id);

CREATE TABLE IF NOT EXISTS video_course_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES video_courses(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

-- Kurs to'liq tugallanganligi (barcha darslar + test) — course-completion XP
-- faqat bir marta berilishi uchun.
CREATE TABLE IF NOT EXISTS video_course_completions (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES video_courses(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);
