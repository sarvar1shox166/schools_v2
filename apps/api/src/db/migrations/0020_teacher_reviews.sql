-- Teacher performance reviews by admin
CREATE TABLE teacher_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  lesson_quality SMALLINT CHECK (lesson_quality BETWEEN 1 AND 5),
  student_results SMALLINT CHECK (student_results BETWEEN 1 AND 5),
  punctuality SMALLINT CHECK (punctuality BETWEEN 1 AND 5),
  communication SMALLINT CHECK (communication BETWEEN 1 AND 5),
  comment TEXT,
  period TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, reviewer_id, period)
);

CREATE INDEX idx_teacher_reviews_teacher ON teacher_reviews(teacher_id);
CREATE INDEX idx_teacher_reviews_tenant ON teacher_reviews(tenant_id);
