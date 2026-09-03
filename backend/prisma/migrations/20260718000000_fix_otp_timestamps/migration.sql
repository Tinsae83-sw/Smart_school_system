-- Fix OTP timestamp columns to carry timezone information.
-- Previously stored as timestamp without time zone (UTC wall clock), which
-- Node compares against a local-time Date, causing spurious expirations.

ALTER TABLE otp_verifications
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE otp_verifications
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';