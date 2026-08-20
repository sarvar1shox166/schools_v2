-- O'qituvchi barcha darslari uchun ishlatadigan standart (zaxira) havola —
-- dars slotida alohida havola kiritilmagan bo'lsa shu ishlatiladi.
ALTER TABLE teachers ADD COLUMN default_meeting_url TEXT;
