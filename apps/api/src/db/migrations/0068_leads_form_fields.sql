-- Landing sahifadagi "bepul dars olish" formasi yoshni aniq son emas,
-- diapazon ("7-9") sifatida va qulay kunlarni ham so'raydi — bular admin
-- lidni diagnostikaga o'tkazishda foydali, shuning uchun saqlanadi.
ALTER TABLE leads ADD COLUMN age_range TEXT;
ALTER TABLE leads ADD COLUMN preferred_days TEXT;
