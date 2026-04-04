'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getPeriodSummary, getPopComparison, getCountrySummary, getDailyDownloads, getAnomalies } from '@/lib/queries'
import { fmtNum, fmtPct, fmtDate, APP_COLORS } from '@/lib/types'
import type { PeriodSummary, PopComparison, CountrySummary, DailyDownload, Anomaly, Platform } from '@/lib/types'
import KpiCard from '@/components/KpiCard'
import TrendChart from '@/components/charts/TrendChart'
import ShareDonut from '@/components/charts/ShareDonut'
import PlatformDonut from '@/components/charts/PlatformDonut'

interface Props { from: string; to: string; plat: string }

export default function DashboardContent({ from, to, plat }: Props) {
  const [pop,       setPop]       = useState<PopComparison[]>([])
  const [summary,   setSummary]   = useState<PeriodSummary[]>([])
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [trend,     setTrend]     = useState<DailyDownload[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const platform = (plat as Platform) || null
    Promise.all([
      getPopComparison(from, to, platform),
      getPeriodSummary(from, to, platform),
      getCountrySummary('MetaMask', from, to, platform, 8),
      getDailyDownloads(from, to, 'MetaMask'),
      getAnomalies(from, to, 'MetaMask'),
    ]).then(([pop, sum, ctry, tr, an]) => {
      setPop(pop); setSummary(sum); setCountries(ctry); setTrend(tr); setAnomalies(an)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [from, to, plat])

  if (loading) return <LoadingSkeleton />
  if (error)   return <div className="p-6 text-sm text-red-500">Error: {error}</div>

  const mm    = pop.find(r => r.app_name === 'MetaMask')
  const mmSum = summary.find(r => r.app_name === 'MetaMask')
  const popVal = mm?.pop_pct ?? null

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="MetaMask downloads" value={fmtNum(mm?.current_downloads ?? 0)}
          meta={`was ${fmtNum(mm?.prior_downloads ?? 0)} prior period`} accent="#FF5C16" />
        <KpiCard label="PoP growth" value={fmtPct(popVal)}
          meta={`${fmtNum(Math.abs(mm?.absolute_change ?? 0))} ${(popVal ?? 0) >= 0 ? 'gain' : 'loss'}`}
          trend={popVal == null ? 'neutral' : popVal > 0 ? 'up' : 'down'} />
        <KpiCard label="Daily average" value={fmtNum(mmSum?.daily_avg ?? 0)}
          meta={`over ${trend.length} days`} />
        <KpiCard label="Peak day" value={fmtDate(mmSum?.peak_day ?? '')}
          meta={fmtNum(mmSum?.peak_downloads ?? 0) + ' downloads'} />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 12, padding: 16 }}>
          <div className="mb-3">
            <p className="text-[12px] font-medium">MetaMask — daily downloads</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {trend.length} days · {anomalies.length} anomalies · {plat || 'all platforms'}
            </p>
          </div>
          <TrendChart data={trend} anomalies={anomalies} />
          <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />Downloads</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Spike</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Drop</span>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-medium mb-3">Market share</p>
          <ShareDonut data={summary} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-medium mb-3">Top countries — MetaMask</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['#','Country','Downloads','Share'].map(h=>(
                  <th key={h} className="text-left pb-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countries.map((c,i) => (
                <tr key={c.country_code} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 text-gray-400">{i+1}</td>
                  <td className="py-1.5">{c.country_name}</td>
                  <td className="py-1.5 font-medium">{fmtNum(c.downloads)}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-700 rounded-full"
                          style={{width:`${countries[0]?.downloads>0?Math.round(c.downloads/countries[0].downloads*100):0}%`}}/>
                      </div>
                      <span className="text-gray-400 text-[10px]">{c.contribution_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-medium mb-3">iOS vs Android — MetaMask</p>
          <PlatformDonut ios={mmSum?.ios_downloads ?? 0} android={mmSum?.android_downloads ?? 0} />
          <div className="flex gap-6 justify-center text-[11px] mt-3">
            <span className="text-gray-500">iOS <strong className="text-gray-900">{mmSum?.ios_pct ?? 0}%</strong></span>
            <span className="text-gray-500">Android <strong className="text-gray-900">{mmSum?.android_pct ?? 0}%</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 h-20 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 animate-pulse" />
        <div className="bg-white border border-gray-100 rounded-xl p-4 h-64 animate-pulse" />
      </div>
    </div>
  )
}
