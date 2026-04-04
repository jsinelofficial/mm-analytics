-- ============================================================
-- STEP 3 of 4: FUNCTIONS
-- Run after Step 2 views are created.
-- ============================================================

-- Period summary: one row per app for any date range
-- Usage: SELECT * FROM f_period_summary('2024-01-01', '2024-03-31', NULL);
-- Usage: SELECT * FROM f_period_summary('2024-01-01', '2024-03-31', 'ios');
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
      AND (p_platform IS NULL OR platform = p_platform)
    GROUP BY app_name, date, platform
  ),
  totals AS (
    SELECT
      app_name,
      SUM(daily_dl)                                                          AS total_downloads,
      COUNT(DISTINCT date)                                                   AS days_with_data,
      ROUND(SUM(daily_dl)::NUMERIC / NULLIF(COUNT(DISTINCT date),0), 0)     AS daily_avg,
      SUM(CASE WHEN platform='ios'     THEN daily_dl ELSE 0 END)            AS ios_downloads,
      SUM(CASE WHEN platform='android' THEN daily_dl ELSE 0 END)            AS android_downloads
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
      AND (p_platform IS NULL OR platform = p_platform)
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

-- PoP comparison: growth % vs prior equivalent period
-- Usage: SELECT * FROM f_pop_comparison('2024-01-01', '2024-03-31', NULL);
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
      AND (p_platform IS NULL OR platform = p_platform)
    GROUP BY app_name
  ),
  prior_period AS (
    SELECT
      app_name,
      SUM(downloads)        AS total,
      COUNT(DISTINCT date)  AS days
    FROM v_performance, prior_range
    WHERE date BETWEEN prior_range.prior_from AND prior_range.prior_to
      AND (p_platform IS NULL OR platform = p_platform)
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

-- Country summary: top N countries for a given app and date range
-- Usage: SELECT * FROM f_country_summary('MetaMask', '2024-01-01', '2024-03-31', NULL, 20);
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
      AND (p_platform IS NULL OR platform = p_platform)
    GROUP BY country_code, country_name, platform
  ),
  totals AS (
    SELECT
      country_code,
      country_name,
      SUM(dl)                                                AS downloads,
      SUM(CASE WHEN platform='ios'     THEN dl ELSE 0 END)  AS ios_downloads,
      SUM(CASE WHEN platform='android' THEN dl ELSE 0 END)  AS android_downloads
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
