export interface PeriodSummary {
  app_name: string
  total_downloads: number
  daily_avg: number
  peak_day: string
  peak_downloads: number
  ios_downloads: number
  android_downloads: number
  ios_pct: number
  android_pct: number
  days_with_data: number
  country_count: number
}

export interface PopComparison {
  app_name: string
  current_downloads: number
  prior_downloads: number
  pop_pct: number | null
  absolute_change: number
  current_daily_avg: number
  prior_daily_avg: number
}

export interface CountrySummary {
  country_code: string
  country_name: string
  downloads: number
  contribution_pct: number
  ios_downloads: number
  android_downloads: number
}

export interface DailyDownload {
  date: string
  app_name: string
  downloads: number
}

export interface Anomaly {
  date: string
  app_name: string
  platform: string
  downloads: number
  rolling_avg_14d: number
  rolling_std_14d: number
  z_score: number
  anomaly_type: 'spike' | 'drop'
  deviation_abs: number
  deviation_pct: number
}

export interface UploadBatch {
  id: string
  filename: string
  row_count: number
  date_range_start: string
  date_range_end: string
  status: 'complete' | 'error' | 'processing'
  created_at: string
}

export type Platform = 'iOS' | 'Android' | ''

export const APP_COLORS: Record<string, string> = {
  'MetaMask':     '#FF5C16',
  'Phantom':      '#D97706',
  'Trust Wallet': '#059669',
  'Base':         '#7C3AED',
  'Bitget Wallet':'#DC2626',
  'Exodus':       '#0891B2',
  'Uniswap':      '#EC4899',
  'Rabby Wallet': '#65A30D',
}

export const ALL_APPS = Object.keys(APP_COLORS)

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return String(Math.round(n || 0))
}

export function fmtPct(n: number | null): string {
  if (n == null) return 'N/A'
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

export function fmtDate(d: string): string {
  return d ? d.slice(5) : '—'
}
