-- Indexes and constraints for existing tables

-- homework: lookup by group
CREATE INDEX IF NOT EXISTS idx_homework_group ON homework(group_id, due_date);
CREATE INDEX IF NOT EXISTS idx_homework_tenant ON homework(tenant_id);

-- puzzle_attempts: lookup by puzzle (for difficulty stats)
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_puzzle ON puzzle_attempts(puzzle_id);

-- CHECK constraints (safe: skip if already exists)
DO $$ BEGIN
  ALTER TABLE students ADD CONSTRAINT chk_students_age_nonneg CHECK (age IS NULL OR age >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE teachers ADD CONSTRAINT chk_teachers_exp_years_nonneg CHECK (exp_years IS NULL OR exp_years >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at columns for tables that lack them
ALTER TABLE students     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE teachers     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE groups       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE packages     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE student_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
