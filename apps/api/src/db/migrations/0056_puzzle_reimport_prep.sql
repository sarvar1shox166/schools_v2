-- 0056_puzzle_reimport_prep.sql
-- Boshqotirmalar bo'limlari mot1..mot5'ga (1-5 xodlik motlar) o'zgartirildi,
-- "series"/"time" bo'limlari bekor qilindi. Avvalgi Lichess importidan kelgan
-- barcha masalalar (external_id bor) o'chiriladi — yangi, real mateIn1..5
-- temalariga mos import bilan almashtiriladi. O'qituvchi qo'lda qo'shgan
-- masalalar (external_id NULL) tegilmaydi.

DELETE FROM puzzle_attempts WHERE puzzle_id IN (SELECT id FROM puzzles WHERE external_id IS NOT NULL);
DELETE FROM puzzles WHERE external_id IS NOT NULL;
