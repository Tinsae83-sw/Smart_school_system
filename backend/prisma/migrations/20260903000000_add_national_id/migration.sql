-- Add Fayda National ID to users table
ALTER TABLE "users" ADD COLUMN "national_id" VARCHAR(20);

-- Unique constraint: each national ID can only be registered once
CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id") WHERE "national_id" IS NOT NULL;
