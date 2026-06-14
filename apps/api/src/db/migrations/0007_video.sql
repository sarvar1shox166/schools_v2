ALTER TABLE schedule_slots ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE schedule_slots ADD COLUMN meeting_url TEXT;
