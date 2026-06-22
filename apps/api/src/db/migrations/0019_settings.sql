-- Tenant-level settings: brand, pricing tiers, system config

CREATE TABLE tenant_settings (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

-- Pricing tiers (replaces hardcoded SettingsPage mock)
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  group_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  individual_per_lesson NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_tiers_tenant ON pricing_tiers(tenant_id, sort_order);

-- Seed demo pricing tiers
INSERT INTO pricing_tiers (tenant_id, name, color, group_monthly, individual_per_lesson, sort_order)
SELECT t.id, tier.name, tier.color, tier.gm, tier.ip, tier.ord
FROM tenants t
CROSS JOIN (VALUES
  ('Boshlang''ich',        '#ef4444', 400000, 120000, 0),
  ('O''rta (3–4 razryad)', '#f97316', 500000, 150000, 1),
  ('Yuqori (1–2 razryad)', '#22c55e', 550000, 180000, 2),
  ('Pro / Nomzod',         '#3b82f6', 750000, 250000, 3)
) AS tier(name, color, gm, ip, ord);
