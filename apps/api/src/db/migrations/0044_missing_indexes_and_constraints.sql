-- Eng ko'p so'raladigan FK ustunlarida indeks yo'q edi (audit topilmasi).
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_tenant ON schedule_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_teacher ON lesson_materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_reviews_reviewer ON teacher_reviews(reviewer_id);

-- schedule_slots.tenant_id — tizimdagi yagona NOT NULL bo'lmagan tenant ustuni edi.
-- Avval qolgan NULL qatorlarni (agar bo'lsa) guruh orqali backfill qilamiz.
UPDATE schedule_slots sl SET tenant_id = g.tenant_id
FROM groups g WHERE sl.group_id = g.id AND sl.tenant_id IS NULL;

ALTER TABLE schedule_slots ALTER COLUMN tenant_id SET NOT NULL;
