-- 0057_puzzle_indexes.sql
-- Boshqotirmalar jadvali endi yuz minglab-millionlab qatorga ega bo'ladi
-- (to'liq Lichess mateIn1..5 importi). GET /puzzles/random bo'lim (va
-- ixtiyoriy qiyinlik) bo'yicha filtrlab, ORDER BY random() LIMIT 1 bilan
-- bitta masala tanlaydi — filtrlash bosqichini indekssiz to'liq jadval
-- skanerisiz bajarish uchun indeks kerak.
CREATE INDEX IF NOT EXISTS idx_puzzles_section ON puzzles(section);
CREATE INDEX IF NOT EXISTS idx_puzzles_section_difficulty ON puzzles(section, difficulty);
