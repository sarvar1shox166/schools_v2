CREATE TABLE elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  elo INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_elo_history_student ON elo_history(student_id, recorded_at);

CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'draw', 'loss')),
  elo_change INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_results_student ON game_results(student_id, played_at);
