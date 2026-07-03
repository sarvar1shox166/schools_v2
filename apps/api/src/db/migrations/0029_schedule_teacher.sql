-- Allow individual/diagnostika slots to be directly assigned to a teacher
-- (they may have no group_id, so the teacher can't be inferred via groups.teacher_id)
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_slots_teacher ON schedule_slots(teacher_id);
