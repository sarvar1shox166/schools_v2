-- Yangi xodim rollari: moderator (darslar/davomat nazorati) va assistant_admin
-- (sozlamalardan tashqari to'liq huquqli yordamchi admin).
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistant_admin';

-- Moderatorga biriktirilgan o'qituvchilar — moderator faqat shu o'qituvchilarning
-- (o'quvchi va o'qituvchi) davomatini ko'radi/to'g'irlaydi.
CREATE TABLE moderator_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  moderator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moderator_user_id, teacher_id)
);

CREATE INDEX idx_moderator_teachers_moderator ON moderator_teachers(moderator_user_id);
CREATE INDEX idx_moderator_teachers_tenant ON moderator_teachers(tenant_id);
