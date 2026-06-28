-- Add operator and accountant to role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
