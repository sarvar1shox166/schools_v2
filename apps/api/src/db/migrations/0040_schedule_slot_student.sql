-- Individual/diagnostika darsni to'g'ridan-to'g'ri o'quvchiga bog'lash imkoniyati
-- (guruhga tegishli bo'lmagan darslar — masalan ariza diagnostikasi — endi
-- o'quvchining o'z jadvalida ko'rinishi uchun).
ALTER TABLE schedule_slots ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE SET NULL;
CREATE INDEX idx_schedule_slots_student ON schedule_slots(student_id);
