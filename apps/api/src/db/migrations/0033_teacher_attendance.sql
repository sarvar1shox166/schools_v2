-- O'qituvchi davomati — faqat statistika/hisobot uchun, payrollga ta'sir qilmaydi
CREATE TYPE teacher_attendance_status AS ENUM ('p', 'a', 'l');

CREATE TABLE teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status teacher_attendance_status NOT NULL,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, schedule_slot_id, date)
);

CREATE INDEX idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_slot_date ON teacher_attendance(schedule_slot_id, date);
CREATE INDEX idx_teacher_attendance_tenant_date ON teacher_attendance(tenant_id, date);
