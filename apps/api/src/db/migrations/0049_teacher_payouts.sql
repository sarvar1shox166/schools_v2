-- Admin tomonidan o'qituvchi kartasiga qo'lda tashlab berilgan pul yozuvi
-- (Payme/Click integratsiyasi yo'q — pul naqd yoki karta orqali qo'lda beriladi,
-- admin bu yerda "shuncha pul o'tkazildi" deb qayd etadi).
CREATE TABLE teacher_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_payouts_teacher ON teacher_payouts(teacher_id);
CREATE INDEX idx_teacher_payouts_tenant ON teacher_payouts(tenant_id);
