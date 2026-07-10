-- Individual/diagnostika darslar guruhga bog'lanmagan (group_id NULL) bo'lishi mumkin,
-- lekin ular ham payroll uchun lesson_sessions'ga yozilishi kerak.
ALTER TABLE lesson_sessions ALTER COLUMN group_id DROP NOT NULL;

-- Kredit sarflanganda aniq qaysi paketdan ayirilganini saqlaydi, shunda davomat
-- bekor qilinganda kredit noto'g'ri (boshqa) paketga qaytarilmaydi.
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS student_package_id UUID REFERENCES student_packages(id) ON DELETE SET NULL;
