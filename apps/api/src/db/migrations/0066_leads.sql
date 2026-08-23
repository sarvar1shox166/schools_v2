-- Landing sahifadagi "bepul dars olish" formasidan keladigan xom
-- so'rovlar — Arizalar (CRM) dan ataylab ajratilgan, chalkashlik bo'lmasligi
-- uchun. Admin ularni ko'rib chiqib, kerak bo'lsa "Arizalar"ga (diagnostika
-- dars belgilash bilan) o'tkazadi.
CREATE TYPE lead_status AS ENUM ('yangi', 'otkazildi', 'rad');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER,
  level TEXT,
  status lead_status NOT NULL DEFAULT 'yangi',
  converted_application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
