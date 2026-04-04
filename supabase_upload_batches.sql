-- ============================================================
-- upload_batches table
-- Run in Supabase SQL Editor before using the Upload page.
-- ============================================================

CREATE TABLE IF NOT EXISTS upload_batches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename          text NOT NULL,
  row_count         integer,
  date_range_start  date,
  date_range_end    date,
  status            text NOT NULL DEFAULT 'complete',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_batches_created
  ON upload_batches (created_at DESC);
