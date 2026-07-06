-- Dars davomiyligi (daqiqa). Butun kodda hozir hamma joyda 90 deb qattiq yozilgan — shu sabab default 90.
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 90
  CHECK (duration_minutes > 0 AND duration_minutes <= 480);

-- "Darsni tugatish" amali ikki marta bosilsa ikkita lessons yozuvi yaratilmasligi uchun
CREATE UNIQUE INDEX IF NOT EXISTS uq_lessons_slot_date
  ON lessons(schedule_slot_id, conducted_at) WHERE schedule_slot_id IS NOT NULL;
