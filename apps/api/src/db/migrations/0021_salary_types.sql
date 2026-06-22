-- Teacher salary type system
CREATE TYPE salary_type AS ENUM (
  'per_lesson',      -- har bir dars uchun stavka (current default)
  'monthly_fixed',   -- oylik sobit maosh
  'percent_income'   -- o'quvchilar to'lovidan foiz
);

ALTER TABLE teacher_rates
  ADD COLUMN salary_type salary_type NOT NULL DEFAULT 'per_lesson',
  ADD COLUMN monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN income_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Students: add login to the query projection (already in users table via migration 0017)
-- Add payment_status view for convenience
CREATE OR REPLACE VIEW student_payment_status AS
SELECT
  s.id AS student_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
        AND sp.used_lessons < sp.total_lessons
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp
      WHERE sp.student_id = s.id AND sp.status = 'active'
        AND sp.used_lessons >= sp.total_lessons
    ) THEN 'debt'
    WHEN EXISTS (
      SELECT 1 FROM student_packages sp WHERE sp.student_id = s.id
    ) THEN 'inactive'
    ELSE 'no_package'
  END AS payment_status,
  (
    SELECT sp.expires_at FROM student_packages sp
    WHERE sp.student_id = s.id AND sp.status = 'active'
    ORDER BY sp.purchased_at DESC LIMIT 1
  ) AS active_package_expires
FROM students s;
