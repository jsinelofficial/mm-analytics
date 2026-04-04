-- ============================================================
-- STEP 1 of 4: INDEXES
-- Run this first. Wait for it to finish before running Step 2.
-- This fixes the timeout errors you're seeing in the dashboard.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pe_date
  ON performance_events (date);

CREATE INDEX IF NOT EXISTS idx_pe_app_date
  ON performance_events (canonical_app_name, date);

CREATE INDEX IF NOT EXISTS idx_pe_platform
  ON performance_events (platform);

CREATE INDEX IF NOT EXISTS idx_pe_country
  ON performance_events (country_code);

CREATE INDEX IF NOT EXISTS idx_pe_app_date_platform
  ON performance_events (canonical_app_name, date, platform);

CREATE INDEX IF NOT EXISTS idx_pe_app_country_date
  ON performance_events (canonical_app_name, country_code, date);
