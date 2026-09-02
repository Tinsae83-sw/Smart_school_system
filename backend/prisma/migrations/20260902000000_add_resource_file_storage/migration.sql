-- Add storage for uploaded study-material files.
-- `file_url` points at either a local `/uploads/...` path (dev) or an
-- S3-compatible object URL (hosted). `storage` records the backend used so
-- downloads/serving can be routed back through the right provider.

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS storage VARCHAR(20) NOT NULL DEFAULT 'local';