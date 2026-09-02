-- Admin tomonidan ustozning "ishlagan" (yig'ilgan) summasiga qo'lda kiritilgan
-- tuzatish (masalan, tizim xatosi tufayli hisoblanmay qolgan darsning puli
-- qo'shiladi, yoki xato hisoblangan summa ayiriladi). teacher_payouts'dan farqi:
-- bu YIG'ILGAN (earned) tomonga tuzatish, real pul o'tkazilgani (paid) emas —
-- shu sabab manfiy bo'lishi ham mumkin (musbat=qo'shish, manfiy=ayirish).
CREATE TABLE teacher_manual_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),
  note TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_manual_earnings_teacher ON teacher_manual_earnings(teacher_id);
CREATE INDEX idx_teacher_manual_earnings_tenant ON teacher_manual_earnings(tenant_id);
