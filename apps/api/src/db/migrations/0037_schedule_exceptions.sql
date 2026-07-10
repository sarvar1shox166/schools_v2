-- Bitta darsni (haftalik shablondan) faqat bitta sanada bekor qilish/ko'chirish, va
-- butun maktab uchun bayram/dam olish kunlarini belgilash imkoniyati.
CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cancelled', 'rescheduled', 'holiday')),
  new_date DATE,
  new_start_time TIME,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedule_exceptions_slot_required CHECK (
    (kind = 'holiday' AND schedule_slot_id IS NULL) OR
    (kind != 'holiday' AND schedule_slot_id IS NOT NULL)
  ),
  UNIQUE (schedule_slot_id, date)
);

CREATE INDEX idx_schedule_exceptions_tenant_date ON schedule_exceptions(tenant_id, date);

-- Bitta sanaga tegishli (takrorlanmaydigan) bayram yozuvi ikki marta kiritilmasin.
CREATE UNIQUE INDEX idx_schedule_exceptions_holiday_unique
  ON schedule_exceptions(tenant_id, date) WHERE kind = 'holiday';

-- Bir martalik darslar (masalan diagnostika) uchun: to'ldirilsa, bu slot faqat shu
-- sanada bo'ladi va haftalik takrorlanuvchi shablon sifatida ishlamaydi.
ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS specific_date DATE;

CREATE INDEX idx_schedule_slots_specific_date ON schedule_slots(specific_date) WHERE specific_date IS NOT NULL;
