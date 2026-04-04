import { supabase } from './supabase'
import type {
  PeriodSummary, PopComparison, CountrySummary,
  DailyDownload, Anomaly, Platform
} from './types'

export async function getPeriodSummary(
  from: string, to: string, platform: Platform | null = null
): Promise<PeriodSummary[]> {
  const { data, error } = await supabase.rpc('f_period_summary', {
    p_from: from, p_to: to, p_platform: platform || null
  })
  if (error) throw error
  return data
}

export async function getPopComparison(
  from: string, to: string, platform: Platform | null = null
): Promise<PopComparison[]> {
  const { data, error } = await supabase.rpc('f_pop_comparison', {
    p_from: from, p_to: to, p_platform: platform || null
  })
  if (error) throw error
  return data
}

export async function getCountrySummary(
  app: string, from: string, to: string,
  platform: Platform | null = null, limit = 20
): Promise<CountrySummary[]> {
  const { data, error } = await supabase.rpc('f_country_summary', {
    p_app: app, p_from: from, p_to: to,
    p_platform: platform || null, p_limit: limit
  })
  if (error) throw error
  return data
}

export async function getDailyDownloads(
  from: string, to: string, appName?: string
): Promise<DailyDownload[]> {
  let query = supabase
    .from('v_daily_downloads_all_platforms')
    .select('date,app_name,downloads')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (appName) query = query.eq('app_name', appName)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAnomalies(
  from: string, to: string, appName?: string
): Promise<Anomaly[]> {
  let query = supabase
    .from('mv_anomalies')
    .select('date,app_name,platform,downloads,rolling_avg_14d,rolling_std_14d,z_score,anomaly_type,deviation_abs,deviation_pct')
    .in('anomaly_type', ['spike', 'drop'])
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (appName) query = query.eq('app_name', appName)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getMonthlyRollup(appName: string, months = 12) {
  const { data, error } = await supabase
    .from('mv_monthly_rollup')
    .select('month,platform,total_downloads,daily_avg,country_count')
    .eq('app_name', appName)
    .order('month', { ascending: false })
    .limit(months * 2) // × 2 for iOS + Android rows
  if (error) throw error
  return data
}
