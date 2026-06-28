-- Upgrade packages table to support proper pricing structure
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS lesson_type TEXT NOT NULL DEFAULT 'group'
    CHECK (lesson_type IN ('group', 'individual')),
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('standard', 'pro')),
  ADD COLUMN IF NOT EXISTS lessons_per_month INTEGER,
  ADD COLUMN IF NOT EXISTS lessons_per_week INTEGER,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS max_students INTEGER,
  ADD COLUMN IF NOT EXISTS delivery TEXT NOT NULL DEFAULT 'online'
    CHECK (delivery IN ('online', 'offline'));

-- Sync lessons_per_month with existing lessons_count where null
UPDATE packages SET lessons_per_month = lessons_count WHERE lessons_per_month IS NULL;

-- Add zoom_link and duration to schedule_slots if not already present
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Add tenant_id to schedule_slots (backfill from groups)
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE schedule_slots ss
SET tenant_id = g.tenant_id
FROM groups g
WHERE g.id = ss.group_id
  AND ss.tenant_id IS NULL;
