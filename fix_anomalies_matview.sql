-- ============================================================
-- ANOMALY FIX: Materialize v_anomalies
-- 
-- Problem: v_anomalies recomputes 8 years of 14-day rolling
-- window calculations on every query → statement timeout.
--
-- Solution: Pre-compute into a materialized view, add indexes,
-- drop the slow regular view, and fold refresh into the
-- existing refresh_materialized_views() function.
--
-- Run this entire file in one go in the SQL Editor.
-- Takes ~30-60 seconds to populate on first run.
-- ============================================================


-- STEP 1: Drop the old slow view
-- (Safe — nothing queries it directly yet except the dashboard,
--  which will be updated to use mv_anomalies instead)
DROP VIEW IF EXISTS v_anomalies;


-- STEP 2: Create the materialized version
-- Computes ALL anomalies across ALL apps, platforms, and dates
-- once — then serves from disk on every subsequent query.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_anomalies AS
WITH daily AS (
  -- Aggregate to daily totals per app + platform
  SELECT
    date,
    app_name,
    platform,
    SUM(downloads) AS daily_total
  FROM v_performance
  GROUP BY date, app_name, platform
),
rolling AS (
  -- 14-day rolling average and stddev
  SELECT
    date,
    app_name,
    platform,
    daily_total,
    AVG(daily_total) OVER (
      PARTITION BY app_name, platform
      ORDER BY date
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    )                                             AS rolling_avg_14d,
    STDDEV(daily_total) OVER (
      PARTITION BY app_name, platform
      ORDER BY date
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    )                                             AS rolling_std_14d,
    -- Need 14 rows of history before flagging — count rows in window
    COUNT(*) OVER (
      PARTITION BY app_name, platform
      ORDER BY date
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    )                                             AS window_rows
  FROM daily
),
scored AS (
  SELECT
    date,
    app_name,
    platform,
    daily_total                                                       AS downloads,
    ROUND(rolling_avg_14d, 0)                                         AS rolling_avg_14d,
    ROUND(rolling_std_14d, 0)                                         AS rolling_std_14d,
    -- Z-score: how many stddevs from the rolling mean
    ROUND(
      CASE
        WHEN rolling_std_14d IS NULL OR rolling_std_14d = 0 THEN 0
        ELSE (daily_total - rolling_avg_14d) / rolling_std_14d
      END, 2
    )                                                                 AS z_score,
    -- Anomaly classification
    CASE
      WHEN window_rows < 14                    THEN 'insufficient_data'
      WHEN rolling_std_14d IS NULL
        OR rolling_std_14d = 0                 THEN 'flat'
      WHEN (daily_total - rolling_avg_14d)
           / rolling_std_14d > 2               THEN 'spike'
      WHEN (daily_total - rolling_avg_14d)
           / rolling_std_14d < -2              THEN 'drop'
      ELSE                                          'normal'
    END                                                               AS anomaly_type,
    -- Magnitude: how far above/below normal in absolute downloads
    ROUND(daily_total - rolling_avg_14d, 0)                          AS deviation_abs,
    -- Pct deviation from rolling avg
    ROUND(
      CASE
        WHEN rolling_avg_14d IS NULL OR rolling_avg_14d = 0 THEN 0
        ELSE (daily_total - rolling_avg_14d) / rolling_avg_14d * 100
      END, 1
    )                                                                 AS deviation_pct
  FROM rolling
)
-- Store everything — both normal and anomalous days —
-- so the dashboard can query any date range efficiently
SELECT * FROM scored;


-- STEP 3: Indexes for common query patterns

-- Primary pattern: "show anomalies for app X in date range"
CREATE INDEX IF NOT EXISTS idx_mv_anomalies_app_date
  ON mv_anomalies (app_name, date);

-- Filter to only spike/drop rows (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_mv_anomalies_type
  ON mv_anomalies (anomaly_type, date DESC)
  WHERE anomaly_type IN ('spike', 'drop');

-- Date-only queries (cross-app anomaly log)
CREATE INDEX IF NOT EXISTS idx_mv_anomalies_date
  ON mv_anomalies (date DESC);

-- Composite for full dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_mv_anomalies_app_type_date
  ON mv_anomalies (app_name, anomaly_type, date DESC)
  WHERE anomaly_type IN ('spike', 'drop');


-- STEP 4: Update the refresh function to include mv_anomalies
-- Replaces the function created in step4_matviews.sql

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_rollup;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_rollup;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_anomalies;
END;
$$;

COMMENT ON FUNCTION refresh_materialized_views IS
  'Refreshes all materialized views: mv_monthly_rollup, mv_weekly_rollup, mv_anomalies. Call after every data upload. Safe to run concurrently.';


-- STEP 5: Add unique index required for CONCURRENTLY refresh
-- (Materialized views need a unique index to refresh concurrently)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_anomalies_pk
  ON mv_anomalies (app_name, platform, date);


-- ============================================================
-- VERIFY — run these after the file completes:
-- ============================================================

-- 1. Check it populated
-- SELECT COUNT(*) FROM mv_anomalies;

-- 2. Check spike/drop counts per app
-- SELECT app_name, anomaly_type, COUNT(*) 
-- FROM mv_anomalies 
-- WHERE anomaly_type IN ('spike','drop')
-- GROUP BY app_name, anomaly_type 
-- ORDER BY app_name, anomaly_type;

-- 3. Most recent anomalies across all apps
-- SELECT date, app_name, platform, downloads, rolling_avg_14d, 
--        z_score, anomaly_type, deviation_pct
-- FROM mv_anomalies
-- WHERE anomaly_type IN ('spike','drop')
-- ORDER BY date DESC
-- LIMIT 20;

-- 4. MetaMask anomalies in 2026
-- SELECT date, platform, downloads, rolling_avg_14d,
--        z_score, anomaly_type, deviation_pct
-- FROM mv_anomalies
-- WHERE app_name = 'MetaMask'
--   AND anomaly_type IN ('spike','drop')
--   AND date >= '2026-01-01'
-- ORDER BY date DESC;

-- 5. Confirm refresh works
-- SELECT refresh_materialized_views();
