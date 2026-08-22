-- Yuborilgan Telegram eslatmalarini kuzatib boradi — sweep har daqiqada
-- ishlaganda bitta eslatma qayta-qayta yuborilib ketmasligi uchun.
CREATE TABLE telegram_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kunlik ("bugungi darslar") eslatmada NULL bo'ladi — bitta darsga bog'liq emas.
  schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kind TEXT NOT NULL, -- student_60min | student_5min | student_start | teacher_5min | teacher_daily
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX telegram_reminders_lesson_uq ON telegram_reminders_sent (schedule_slot_id, date, kind, recipient_user_id)
  WHERE schedule_slot_id IS NOT NULL;
CREATE UNIQUE INDEX telegram_reminders_daily_uq ON telegram_reminders_sent (date, kind, recipient_user_id)
  WHERE schedule_slot_id IS NULL;
