-- Telegram bot orqali bir martalik bog'lash havolasi (deep link) uchun —
-- veb-ilova (foydalanuvchi tizimga kirgan holda) token yaratadi, bot /start
-- payload orqali shu tokenni iste'mol qilib akkountni avtomatik bog'laydi.
CREATE TABLE telegram_link_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
