-- Add login field to users; existing users keep phone as their login value
ALTER TABLE users ADD COLUMN IF NOT EXISTS login TEXT UNIQUE;

-- Backfill: use phone as default login for all existing users
UPDATE users SET login = phone WHERE login IS NULL;

-- Now make it NOT NULL
ALTER TABLE users ALTER COLUMN login SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
