ALTER TABLE student_xp ADD COLUMN attendance_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_xp ADD COLUMN last_attendance_date DATE;

DELETE FROM achievements;

INSERT INTO achievements (code, name, description, icon, xp_threshold, streak_threshold) VALUES
  ('games_100', 'Faol o''yinchi', '100 marta shaxmat o''ynadingiz', 'swords', NULL, NULL),
  ('xp_5000', 'Tajribali', '5000 XP to''pladingiz', 'zap', 5000, NULL),
  ('puzzles_1000', 'Boshqotirma ustasi', '1000 ta boshqotirma yechdingiz', 'puzzle', NULL, NULL),
  ('rank_1', 'Chempion', 'Reytingda 1-o''ringa chiqdingiz', 'crown', NULL, NULL),
  ('attendance_streak_7', 'Intizomli', 'Ketma-ket 7 kun darslarga qatnashdingiz', 'flag', NULL, 7);
