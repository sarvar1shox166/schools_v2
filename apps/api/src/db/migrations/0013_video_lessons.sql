CREATE TABLE video_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('zoom','debyut','taktika','endshpil','strategiya')),
  video_url TEXT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_color TEXT,
  thumbnail_icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE video_progress (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  watched_at TIMESTAMPTZ,
  PRIMARY KEY (student_id, video_id)
);
