-- `puzzles` jadvali endi 1.8M+ qatorga ega (to'liq Lichess mateIn1..5
-- importi) — `ORDER BY random() LIMIT 1` bunday hajmda har safar
-- butun mos qatorlar to'plamini skanerlab, tasodifiy son hisoblab,
-- saralaydi (production'da ~400ms/so'rov o'lchandi). Buning o'rniga
-- `id` (gen_random_uuid() — tabiiy tekis taqsimlangan) bo'yicha indeks
-- orqali tasodifiy nuqtadan eng yaqin qatorni olamiz (id sharti indeks
-- range scan bilan bajariladi, jadval hajmidan qat'i nazar tez).
CREATE INDEX IF NOT EXISTS idx_puzzles_section_id ON puzzles(section, id);
CREATE INDEX IF NOT EXISTS idx_puzzles_section_difficulty_id ON puzzles(section, difficulty, id);
