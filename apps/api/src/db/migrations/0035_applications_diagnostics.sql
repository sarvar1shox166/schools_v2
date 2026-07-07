-- Status enum: 4 -> 3 qiymat (yangi+korildi -> diagnostika, qabul -> royxatdan_otdi, rad -> rad)
CREATE TYPE application_status_new AS ENUM ('diagnostika', 'royxatdan_otdi', 'rad');

ALTER TABLE applications ADD COLUMN status_new application_status_new;
UPDATE applications SET status_new = CASE
  WHEN status IN ('yangi', 'korildi') THEN 'diagnostika'::application_status_new
  WHEN status = 'qabul' THEN 'royxatdan_otdi'::application_status_new
  WHEN status = 'rad' THEN 'rad'::application_status_new
END;
ALTER TABLE applications ALTER COLUMN status_new SET NOT NULL;
ALTER TABLE applications ALTER COLUMN status_new SET DEFAULT 'diagnostika';
ALTER TABLE applications DROP COLUMN status;
ALTER TABLE applications RENAME COLUMN status_new TO status;
DROP TYPE application_status;
ALTER TYPE application_status_new RENAME TO application_status;
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(tenant_id, status);

-- Yangi manba: Instagram
ALTER TYPE application_source ADD VALUE IF NOT EXISTS 'instagram';

-- Diagnostika maydonlari + haftalik jadvalga bog'lanish
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS diagnostic_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS diagnostic_day_of_week SMALLINT CHECK (diagnostic_day_of_week BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS diagnostic_time TIME,
  ADD COLUMN IF NOT EXISTS meeting_platform TEXT NOT NULL DEFAULT 'zoom',
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_applications_diagnostic_teacher ON applications(diagnostic_teacher_id);
CREATE INDEX IF NOT EXISTS idx_applications_schedule_slot ON applications(schedule_slot_id);
