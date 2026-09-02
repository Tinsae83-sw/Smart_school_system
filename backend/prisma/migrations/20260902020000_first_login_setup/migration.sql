-- First-login setup: admin-created accounts are provisioned with a
-- temporary/generated password and must verify their email (via OTP) and set
-- a real password before they can use the system.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE;