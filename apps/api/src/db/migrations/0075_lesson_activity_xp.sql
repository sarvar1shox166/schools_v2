-- O'qituvchi "Bugungi darslar" sehrgarida (TMaterialsPage) 3-qadamda har bir
-- o'quvchiga qo'lda XP beradi ("Darsdagi faollik"). Bu qadam faqat lokal
-- React state bilan boshqarilgani uchun kartani yopib-ochish yoki sahifani
-- yangilash oqimni "1-qadam"ga qaytarardi va "Yakunlash" qayta bosilsa XP
-- YANA berilardi — bir xil o'quvchiga bir xil dars uchun cheksiz marta.
--
-- Shu jadval bitta o'quvchiga bitta dars (schedule_slot_id + sana) uchun
-- qo'lda XP faqat BIR MARTA berilishini DB darajasida kafolatlaydi:
-- POST /teacher/students/:studentId/xp endpointi XP berishdan oldin shu
-- yerga INSERT ... ON CONFLICT DO NOTHING qiladi — qator qaytmasa (allaqachon
-- mavjud bo'lsa), awardXp() umuman chaqirilmaydi va 409 qaytariladi.
--
-- Bundan tashqari /schedule/today endpointi shu jadval bo'yicha
-- "activityXpAwarded" bayrog'ini hisoblab beradi — frontend shu bilan butun
-- "3. XP berish" qadamini oldindan bloklaydi (qayta ochib "Yakunlash"ni
-- bosishga urinib ko'rmasdan).
CREATE TABLE lesson_activity_xp (
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  amount           INTEGER NOT NULL,
  awarded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, schedule_slot_id, date)
);
