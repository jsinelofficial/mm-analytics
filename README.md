# MM Analytics — MetaMask App Store Analytics Platform

Next.js 16 + TypeScript + Tailwind + Supabase + Recharts

## Setup

### 1. Environment variables

Create `.env.local` (already included for local dev, add to Vercel for production):

```
NEXT_PUBLIC_SUPABASE_URL=https://rpzbugszenookpaepicl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

> ⚠️ `ANTHROPIC_API_KEY` is used server-side only (in `/app/api/insight/route.ts`).
> Never expose it as `NEXT_PUBLIC_`.

### 2. Supabase — run SQL migrations (if not already done)

Run these files in order in the Supabase SQL Editor:

1. `supabase_views.sql` — step1 through step4 (indexes, views, functions, materialized views)
2. `hotfix_platform_case.sql` — fixes iOS/Android case sensitivity
3. `fix_anomalies_matview.sql` — materializes anomaly detection
4. `supabase_upload_batches.sql` — creates the upload history table

### 3. Install and run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo in the Vercel dashboard.
Add environment variables in Vercel → Project → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — MetaMask KPIs, trend chart with anomaly markers, market share, top countries |
| `/trends` | All-apps daily trends + period summary table |
| `/competitors` | PoP comparison, indexed momentum chart, competitor table |
| `/countries` | Country drill-down per app, top 12 bar chart |
| `/anomalies` | Spike/drop log from `mv_anomalies`, frequency chart, MetaMask trend overlay |
| `/insights` | AI insights via Claude API — performance, anomaly, competitor, country analysis |
| `/upload` | Drag-and-drop Sensor Tower Excel upload with SheetJS parsing |

## Data flow

```
Sensor Tower Excel
  → /upload page (SheetJS parse)
  → /api/upload (upsert to performance_events)
  → SELECT refresh_materialized_views() (run after upload)
  → Dashboard queries via Supabase views/functions
```

## After every data upload

Run in Supabase SQL Editor:
```sql
SELECT refresh_materialized_views();
```

Or automate via Railway webhook calling this function.

## SQL objects used

| Object | Type | Purpose |
|--------|------|---------|
| `v_performance` | View | Normalized base — merges Meta Mask → MetaMask |
| `v_daily_downloads_all_platforms` | View | Daily totals per app for trend charts |
| `f_period_summary()` | Function | One row per app: totals, avg, peak, iOS/Android split |
| `f_pop_comparison()` | Function | PoP growth vs prior equivalent period |
| `f_country_summary()` | Function | Top N countries with contribution % |
| `mv_anomalies` | Mat. View | Pre-computed 14-day rolling z-scores — instant queries |
| `mv_monthly_rollup` | Mat. View | Monthly aggregates for fast KPI cards |
| `mv_weekly_rollup` | Mat. View | Weekly aggregates for 90d+ charts |
