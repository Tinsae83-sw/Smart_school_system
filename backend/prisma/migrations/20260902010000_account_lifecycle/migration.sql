-- Real account lifecycle: registration requests land as PENDING and only
-- become usable once an admin/registrar approves them.
--   PENDING  - created via self-service signup; cannot log in yet
--   ACTIVE   - approved by admin / created directly by admin
--   REJECTED - admin denied the request
--   SUSPENDED- admin disabled an existing account
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- Existing accounts (including seed data) keep working as ACTIVE.
-- A materialized checklist of enrollment info captured at signup time, used by
-- the admin/registrar to assign the class and link parents on approval.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS requested_class_id INTEGER REFERENCES school_classes(class_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_relationship VARCHAR(50),
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3);