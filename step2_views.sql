-- ============================================================
-- STEP 2 of 4: CORE VIEWS
-- Run after Step 1 indexes are complete.
-- ============================================================

-- Base normalized view (merges "Meta Mask" → "MetaMask")
CREATE OR REPLACE VIEW v_performance AS
SELECT
  pe.id,
  pe.date,
  CASE pe.canonical_app_name
    WHEN 'Meta Mask' THEN 'MetaMask'
    ELSE pe.canonical_app_name
  END                          AS app_name,
  pe.raw_app_name,
  pe.platform,
  pe.source,
  pe.country_code,
  pe.country_name,
  pe.downloads,
  pe.created_at
FROM performance_events pe;

-- Daily downloads per app + platform
CREATE OR REPLACE VIEW v_daily_downloads AS
SELECT
  date,
  app_name,
  platform,
  SUM(downloads)               AS downloads,
  COUNT(DISTINCT country_code) AS country_count
FROM v_performance
GROUP BY date, app_name, platform;

-- Daily downloads per app (all platforms combined)
CREATE OR REPLACE VIEW v_daily_downloads_all_platforms AS
SELECT
  date,
  app_name,
  SUM(downloads)               AS downloads,
  COUNT(DISTINCT country_code) AS country_count
FROM v_performance
GROUP BY date, app_name;

-- Country-level daily rollup
CREATE OR REPLACE VIEW v_country_downloads AS
SELECT
  app_name,
  platform,
  country_code,
  country_name,
  date,
  SUM(downloads) AS downloads
FROM v_performance
GROUP BY app_name, platform, country_code, country_name, date;

-- Anomaly detection (2-sigma spikes and drops, 14-day rolling window)
CREATE OR REPLACE VIEW v_anomalies AS
WITH daily AS (
  SELECT
    date,
    app_name,
    platform,
    SUM(downloads) AS daily_total
  FROM v_performance
  GROUP BY date, app_name, platform
),
rolling AS (
  SELECT
    date,
    app_name,
    platform,
    daily_total,
    AVG(daily_total) OVER (
      PARTITION BY app_name, platform
      ORDER BY date
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ) AS rolling_avg_14d,
    STDDEV(daily_total) OVER (
      PARTITION BY app_name, platform
      ORDER BY date
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ) AS rolling_std_14d
  FROM daily
)
SELECT
  date,
  app_name,
  platform,
  daily_total                                                           AS downloads,
  ROUND(rolling_avg_14d, 0)                                             AS rolling_avg_14d,
  ROUND(rolling_std_14d, 0)                                             AS rolling_std_14d,
  ROUND(
    CASE WHEN rolling_std_14d = 0 OR rolling_std_14d IS NULL THEN 0
         ELSE (daily_total - rolling_avg_14d) / rolling_std_14d
    END, 2
  )                                                                     AS z_score,
  CASE
    WHEN rolling_std_14d IS NULL THEN 'insufficient_data'
    WHEN (daily_total - rolling_avg_14d) / NULLIF(rolling_std_14d,0) >  2 THEN 'spike'
    WHEN (daily_total - rolling_avg_14d) / NULLIF(rolling_std_14d,0) < -2 THEN 'drop'
    ELSE 'normal'
  END                                                                   AS anomaly_type
FROM rolling
WHERE ABS(
  CASE WHEN rolling_std_14d = 0 OR rolling_std_14d IS NULL THEN 0
       ELSE (daily_total - rolling_avg_14d) / rolling_std_14d
  END
) > 2
  AND rolling_std_14d IS NOT NULL;
