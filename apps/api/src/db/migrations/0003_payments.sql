CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lessons_count INTEGER NOT NULL CHECK (lessons_count > 0),
  price NUMERIC(12, 2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE student_package_status AS ENUM ('active', 'finished', 'expired');

CREATE TABLE student_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  total_lessons INTEGER NOT NULL CHECK (total_lessons > 0),
  used_lessons INTEGER NOT NULL DEFAULT 0,
  status student_package_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE
);

CREATE INDEX idx_student_packages_student ON student_packages(student_id);

CREATE TYPE payment_method AS ENUM ('click', 'payme', 'naqd', 'uzcard');
CREATE TYPE transaction_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_package_id UUID REFERENCES student_packages(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
