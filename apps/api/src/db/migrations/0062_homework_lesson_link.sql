-- Uy vazifasi endi aniq dars (sana+vaqt) bilan bog'lanadi — bir guruhda
-- bir necha marta dars bo'lganda "qaysi vaqtdagi dars uchun qaysi vazifa"
-- degan savolga javob beradi. Guruh nomi ham saqlanadi (qo'shimcha kontekst).
ALTER TABLE homework ADD COLUMN schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE SET NULL;
ALTER TABLE homework ADD COLUMN lesson_date DATE;
