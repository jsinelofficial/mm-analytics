-- ============================================================
-- HOTFIX: Platform values are 'iOS' and 'Android' (capitalized)
-- not 'ios' and 'android'. Run this to fix the functions and
-- views that were written assuming lowercase.
-- ============================================================

-- Fix f_period_summary (iOS/Android split was returning 0)
CREATE OR REPLACE FUNCTION f_period_summary(
  p_from     DATE,
  p_to       DATE,
  p_platform TEXT DEFAULT NULL
)
RETURNS TABLE (
  app_name          TEXT,
  total_downloads   BIGINT,
  daily_avg         NUMERIC,
  peak_day          DATE,
  peak_downloads    BIGINT,
  ios_downloads     BIGINT,
  android_downloads BIGINT,
  ios_pct           NUMERIC,
  android_pct       NUMERIC,
  days_with_data    INT,
  country_count     INT
)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT
      app_name,
      date,
      platform,
      SUM(downloads) AS daily_dl
    FROM v_performance
    WHERE date BETWEEN p_from AND p_to
      AND (p_platform IS NULL OR LOWER(platform) = LOWER(p_platform))
    GROUP BY app_name, date, platform
  ),
  totals AS (
    SELECT
      app_name,
      SUM(daily_dl)                                                          AS total_downloads,
      COUNT(DISTINCT date)                                                   AS days_with_data,
      ROUND(SUM(daily_dl)::NUMERIC / NULLIF(COUNT(DISTINCT date),0), 0)     AS daily_avg,
      SUM(CASE WHEN LOWER(platform)='ios'     THEN daily_dl ELSE 0 END)     AS ios_downloads,
      SUM(CASE WHEN LOWER(platform)='android' THEN daily_dl ELSE 0 END)     AS android_downloads
    FROM base
    GROUP BY app_name
  ),
  peaks AS (
    SELECT DISTINCT ON (app_name)
      app_name,
      date                                                                   AS peak_day,
      SUM(daily_dl) OVER (PARTITION BY app_name, date)                      AS peak_downloads
    FROM base
    ORDER BY app_name, SUM(daily_dl) OVER (PARTITION BY app_name, date) DESC
  ),
  countries AS (
    SELECT
      app_name,
      COUNT(DISTINCT country_code) AS country_count
    FROM v_performance
    WHERE date BETWEEN p_from AND p_to
      AND (p_platform IS NULL OR LOWER(platform) = LOWER(p_platform))
    GROUP BY app_name
  )
  SELECT
    t.app_name,
    t.total_downloads,
    t.daily_avg,
    p.peak_day,
    p.peak_downloads,
    t.ios_downloads,
    t.android_downloads,
    ROUND(t.ios_downloads::NUMERIC     / NULLIF(t.total_downloads,0) * 100, 1) AS ios_pct,
    ROUND(t.android_downloads::NUMERIC / NULLIF(t.total_downloads,0) * 100, 1) AS android_pct,
    t.days_with_data,
    c.country_count
  FROM totals t
  JOIN peaks     p ON p.app_name = t.app_name
  JOIN countries c ON c.app_name = t.app_name
  ORDER BY t.total_downloads DESC;
$$;

-- Fix f_pop_comparison (platform filter was case-sensitive)
CREATE OR REPLACE FUNCTION f_pop_comparison(
  p_from     DATE,
  p_to       DATE,
  p_platform TEXT DEFAULT NULL
)
RETURNS TABLE (
  app_name          TEXT,
  current_downloads BIGINT,
  prior_downloads   BIGINT,
  pop_pct           NUMERIC,
  absolute_change   BIGINT,
  current_daily_avg NUMERIC,
  prior_daily_avg   NUMERIC
)
LANGUAGE sql STABLE AS $$
  WITH
  prior_range AS (
    SELECT
      (p_from - (p_to - p_from + 1)) AS prior_from,
      (p_from - 1)                    AS prior_to
  ),
  current_period AS (
    SELECT
      app_name,
      SUM(downloads)        AS total,
      COUNT(DISTINCT date)  AS days
    FROM v_performance
    WHERE date BETWEEN p_from AND p_to
      AND (p_platform IS NULL OR LOWER(platform) = LOWER(p_platform))
    GROUP BY app_name
  ),
  prior_period AS (
    SELECT
      app_name,
      SUM(downloads)        AS total,
      COUNT(DISTINCT date)  AS days
    FROM v_performance, prior_range
    WHERE date BETWEEN prior_range.prior_from AND prior_range.prior_to
      AND (p_platform IS NULL OR LOWER(platform) = LOWER(p_platform))
    GROUP BY app_name
  )
  SELECT
    c.app_name,
    c.total                                                                   AS current_downloads,
    COALESCE(p.total, 0)                                                      AS prior_downloads,
    CASE WHEN COALESCE(p.total,0)=0 THEN NULL
         ELSE ROUND((c.total - p.total)::NUMERIC / p.total * 100, 1)
    END                                                                       AS pop_pct,
    c.total - COALESCE(p.total, 0)                                            AS absolute_change,
    ROUND(c.total::NUMERIC / NULLIF(c.days,0), 0)                            AS current_daily_avg,
    ROUND(COALESCE(p.total,0)::NUMERIC / NULLIF(COALESCE(p.days,0),0), 0)   AS prior_daily_avg
  FROM current_period c
  LEFT JOIN prior_period p ON p.app_name = c.app_name
  ORDER BY c.total DESC;
$$;

-- Fix f_country_summary (platform filter was case-sensitive)
CREATE OR REPLACE FUNCTION f_country_summary(
  p_app      TEXT,
  p_from     DATE,
  p_to       DATE,
  p_platform TEXT DEFAULT NULL,
  p_limit    INT  DEFAULT 20
)
RETURNS TABLE (
  country_code      TEXT,
  country_name      TEXT,
  downloads         BIGINT,
  contribution_pct  NUMERIC,
  ios_downloads     BIGINT,
  android_downloads BIGINT
)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT
      country_code,
      country_name,
      platform,
      SUM(downloads) AS dl
    FROM v_performance
    WHERE app_name = p_app
      AND date BETWEEN p_from AND p_to
      AND (p_platform IS NULL OR LOWER(platform) = LOWER(p_platform))
    GROUP BY country_code, country_name, platform
  ),
  totals AS (
    SELECT
      country_code,
      country_name,
      SUM(dl)                                                                AS downloads,
      SUM(CASE WHEN LOWER(platform)='ios'     THEN dl ELSE 0 END)           AS ios_downloads,
      SUM(CASE WHEN LOWER(platform)='android' THEN dl ELSE 0 END)           AS android_downloads
    FROM base
    GROUP BY country_code, country_name
  ),
  grand AS (SELECT SUM(downloads) AS grand_total FROM totals)
  SELECT
    t.country_code,
    t.country_name,
    t.downloads,
    ROUND(t.downloads::NUMERIC / NULLIF(g.grand_total,0) * 100, 2) AS contribution_pct,
    t.ios_downloads,
    t.android_downloads
  FROM totals t, grand g
  ORDER BY t.downloads DESC
  LIMIT p_limit;
$$;

-- Fix v_performance base view (normalize platform to proper case)
CREATE OR REPLACE VIEW v_performance AS
SELECT
  pe.id,
  pe.date,
  CASE pe.canonical_app_name
    WHEN 'Meta Mask' THEN 'MetaMask'
    ELSE pe.canonical_app_name
  END                AS app_name,
  pe.raw_app_name,
  pe.platform,       -- kept as-is ('iOS', 'Android') — use LOWER() in comparisons
  pe.source,
  pe.country_code,
  pe.country_name,
  pe.downloads,
  pe.created_at
FROM performance_events pe;

-- Verify the fix worked — should now show real iOS/Android numbers:
-- SELECT * FROM f_period_summary('2026-01-01', '2026-03-31', NULL) LIMIT 3;
-- SELECT * FROM f_period_summary('2026-01-01', '2026-03-31', 'iOS') LIMIT 3;
