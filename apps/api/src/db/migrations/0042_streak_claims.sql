ALTER TABLE student_xp ADD COLUMN IF NOT EXISTS total_streak_claims INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_xp ADD COLUMN IF NOT EXISTS last_streak_claim_date DATE;
