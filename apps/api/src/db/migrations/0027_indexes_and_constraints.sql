-- Missing indexes for frequently queried columns

-- messages: lookup by recipient (unread messages, inbox)
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at);

-- lesson_recordings: lookup by group and date
CREATE INDEX IF NOT EXISTS idx_lesson_recordings_group ON lesson_recordings(group_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_lesson_recordings_tenant ON lesson_recordings(tenant_id);

-- homework: lookup by group for teacher portal
CREATE INDEX IF NOT EXISTS idx_homework_group ON homework(group_id, due_date);
CREATE INDEX IF NOT EXISTS idx_homework_tenant ON homework(tenant_id);

-- puzzle_attempts: lookup by puzzle (for difficulty stats)
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_puzzle ON puzzle_attempts(puzzle_id);

-- CHECK constraints for non-negative numeric fields

ALTER TABLE students
  ADD CONSTRAINT chk_students_age_nonneg
    CHECK (age IS NULL OR age >= 0);

ALTER TABLE teachers
  ADD CONSTRAINT chk_teachers_exp_years_nonneg
    CHECK (exp_years IS NULL OR exp_years >= 0);

-- Change attendance_records.lesson_id CASCADE to RESTRICT
-- so that deleting a lesson does not silently wipe attendance history
ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_lesson_id_fkey;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE RESTRICT;

-- updated_at columns for tables that lack them

ALTER TABLE students  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE teachers  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE groups    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE packages  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE student_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
