CREATE TYPE lesson_type AS ENUM ('group', 'individual', 'diagnostic');

ALTER TABLE groups ADD COLUMN lesson_type lesson_type NOT NULL DEFAULT 'group';

CREATE TABLE teacher_rates (
  teacher_id UUID PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
  group_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  individual_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  diagnostic_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  retention_coef NUMERIC(4, 2) NOT NULL DEFAULT 1
);

CREATE TABLE lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  lesson_type lesson_type NOT NULL DEFAULT 'group',
  date DATE NOT NULL,
  students_count INTEGER NOT NULL DEFAULT 0,
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_slot_id, date)
);

CREATE INDEX idx_lesson_sessions_teacher ON lesson_sessions(teacher_id);
CREATE INDEX idx_lesson_sessions_date ON lesson_sessions(date);

CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  group_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  individual_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  diagnostic_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, period)
);
