-- ============================================================
-- STEP 4 of 4: MATERIALIZED VIEWS + REFRESH FUNCTION
-- Run after Step 3. These pre-aggregate heavy rollups so
-- the dashboard KPI cards load instantly.
-- Note: First run will take a minute to populate.
-- ============================================================

-- Monthly rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_rollup AS
SELECT
  DATE_TRUNC('month', date)::DATE                                          AS month,
  app_name,
  platform,
  SUM(downloads)                                                           AS total_downloads,
  COUNT(DISTINCT date)                                                     AS days_with_data,
  ROUND(SUM(downloads)::NUMERIC / NULLIF(COUNT(DISTINCT date),0), 0)      AS daily_avg,
  COUNT(DISTINCT country_code)                                             AS country_count
FROM v_performance
GROUP BY DATE_TRUNC('month', date), app_name, platform;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_rollup_pk
  ON mv_monthly_rollup (month, app_name, platform);

CREATE INDEX IF NOT EXISTS idx_mv_monthly_rollup_app
  ON mv_monthly_rollup (app_name, month);

-- Weekly rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_rollup AS
SELECT
  DATE_TRUNC('week', date)::DATE                                           AS week_start,
  app_name,
  platform,
  SUM(downloads)                                                           AS total_downloads,
  COUNT(DISTINCT date)                                                     AS days_with_data,
  COUNT(DISTINCT country_code)                                             AS country_count
FROM v_performance
GROUP BY DATE_TRUNC('week', date), app_name, platform;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_weekly_rollup_pk
  ON mv_weekly_rollup (week_start, app_name, platform);

-- Refresh helper — call this after every data upload
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_rollup;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_rollup;
END;
$$;

-- ============================================================
-- VERIFY EVERYTHING WORKED — run these after all 4 steps:
-- ============================================================
-- SELECT indexname FROM pg_indexes WHERE tablename = 'performance_events';
-- SELECT MIN(date), MAX(date), COUNT(*) FROM performance_events;
-- SELECT * FROM f_period_summary(CURRENT_DATE-30, CURRENT_DATE, NULL);
-- SELECT * FROM f_pop_comparison(CURRENT_DATE-30, CURRENT_DATE, NULL);
-- SELECT * FROM f_country_summary('MetaMask', CURRENT_DATE-30, CURRENT_DATE, NULL, 10);
-- SELECT * FROM v_anomalies WHERE date > CURRENT_DATE-90 ORDER BY date DESC LIMIT 10;
-- SELECT * FROM mv_monthly_rollup WHERE app_name='MetaMask' ORDER BY month DESC LIMIT 6;
