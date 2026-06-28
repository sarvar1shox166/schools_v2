-- Actual conducted lesson sessions (separate from schedule_slots which are recurring templates)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  conducted_at DATE NOT NULL,
  topic TEXT,
  homework TEXT,
  zoom_link TEXT,
  status TEXT NOT NULL DEFAULT 'conducted' CHECK (status IN ('conducted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_tenant ON lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_group ON lessons(group_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(conducted_at);

-- Add excused absence status to the enum
-- 'ae' = absent excused (darsga sababli kelmadi — dars hisoblanmaydi)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'ae';

-- Extend attendance_records with lesson link, reason, and credit tracking
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS lesson_counted BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_attendance_lesson ON attendance_records(lesson_id);
