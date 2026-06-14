CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fen TEXT NOT NULL,
  solution TEXT[] NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'oson' CHECK (difficulty IN ('oson', 'orta', 'qiyin')),
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE puzzle_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_puzzle_attempts_student ON puzzle_attempts(student_id);

CREATE TABLE student_xp (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  xp_threshold INTEGER,
  streak_threshold INTEGER
);

CREATE TABLE student_achievements (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, achievement_id)
);

INSERT INTO achievements (code, name, description, icon, xp_threshold, streak_threshold) VALUES
  ('first_solve', 'Birinchi qadam', 'Birinchi boshqotirmani yechdingiz', 'star', NULL, NULL),
  ('xp_100', 'Boshlovchi', '100 XP to''pladingiz', 'zap', 100, NULL),
  ('xp_500', 'Tajribali', '500 XP to''pladingiz', 'award', 500, NULL),
  ('xp_1000', 'Usta', '1000 XP to''pladingiz', 'crown', 1000, NULL),
  ('streak_3', 'Barqaror', '3 kunlik streak', 'flag', NULL, 3),
  ('streak_7', 'Sodiq', '7 kunlik streak', 'flag', NULL, 7);
