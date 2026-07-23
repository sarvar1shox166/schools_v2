-- Refresh-token revocation: har foydalanuvchida token_version saqlanadi.
-- Refresh-token ichidagi tv shu qiymatga mos kelmasa — token bekor qilingan
-- hisoblanadi. Parol tiklanganda / hisob o'chirilganda tv oshiriladi va
-- barcha eski refresh-tokenlar bir zumda ishlamay qoladi.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
