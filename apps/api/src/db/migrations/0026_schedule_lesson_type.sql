-- Allow group_id to be NULL for individual / diagnostika slots
ALTER TABLE schedule_slots ALTER COLUMN group_id DROP NOT NULL;

-- Store tenant directly on the slot (needed when group_id is NULL)
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill tenant_id from groups for existing rows
UPDATE schedule_slots sl
SET tenant_id = g.tenant_id
FROM groups g
WHERE g.id = sl.group_id AND sl.tenant_id IS NULL;

-- Lesson type: guruh | individual | diagnostika
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS lesson_type TEXT NOT NULL DEFAULT 'guruh';

-- Custom name shown when type != guruh
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- Online meeting platform: zoom | meet
ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS meeting_platform TEXT NOT NULL DEFAULT 'zoom';
