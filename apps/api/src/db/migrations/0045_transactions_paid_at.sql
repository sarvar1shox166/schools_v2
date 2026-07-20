-- Payme PerformTransaction protokoli qayta chaqirilganda bir xil perform_time
-- qaytarishni talab qiladi — buning uchun to'lov vaqtini saqlaymiz.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
