-- CRM: incoming student applications (leads)
CREATE TYPE application_status AS ENUM ('yangi', 'korildi', 'qabul', 'rad');
CREATE TYPE application_source AS ENUM ('telegram', 'website', 'phone', 'referral', 'other');

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER,
  level TEXT,
  source application_source NOT NULL DEFAULT 'other',
  note TEXT,
  status application_status NOT NULL DEFAULT 'yangi',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  converted_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_tenant ON applications(tenant_id);
CREATE INDEX idx_applications_status ON applications(tenant_id, status);
