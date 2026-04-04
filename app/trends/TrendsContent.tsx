'use client'

import { useEffect, useState } from 'react'
import { getPeriodSummary, getDailyDownloads } from '@/lib/queries'
import { fmtNum, fmtDate, APP_COLORS } from '@/lib/types'
import type { PeriodSummary, DailyDownload, Platform } from '@/lib/types'
import MultiTrendChart from '@/components/charts/MultiTrendChart'

interface Props { from: string; to: string; plat: string }

export default function TrendsContent({ from, to, plat }: Props) {
  const [summary, setSummary] = useState<PeriodSummary[]>([])
  const [trend,   setTrend]   = useState<DailyDownload[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    const platform = (plat as Platform) || null
    Promise.all([
      getPeriodSummary(from, to, platform),
      getDailyDownloads(from, to),
    ]).then(([s, t]) => { setSummary(s); setTrend(t); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [from, to, plat])

  if (loading) return <div className="p-6 flex flex-col gap-3">{[...Array(2)].map((_,i)=><div key={i} className="bg-white border border-gray-100 rounded-xl h-48 animate-pulse"/>)}</div>
  if (error)   return <div className="p-6 text-sm text-red-500">Error: {error}</div>

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[12px] font-medium mb-1">Daily downloads — all apps</p>
        <p className="text-[10px] text-gray-400 mb-3">v_daily_downloads_all_platforms</p>
        <div className="flex flex-wrap gap-3 mb-3">
          {Object.keys(APP_COLORS).map(app => (
            <span key={app} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{background:APP_COLORS[app]}}/>{app}
            </span>
          ))}
        </div>
        <MultiTrendChart data={trend} height={260} />
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[12px] font-medium mb-3">Period summary — all apps</p>
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-gray-100">
            {['App','Downloads','Daily avg','Peak day','Peak DLs','iOS %','Android %','Countries'].map(h=>(
              <th key={h} className="text-left pb-2 pr-4 text-[10px] text-gray-400 font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {summary.map(r => (
              <tr key={r.app_name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4"><span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{background:APP_COLORS[r.app_name]||'#9CA3AF'}}/>
                  {r.app_name}</span></td>
                <td className="py-2 pr-4 font-medium">{fmtNum(r.total_downloads)}</td>
                <td className="py-2 pr-4">{fmtNum(r.daily_avg)}</td>
                <td className="py-2 pr-4 text-gray-500">{fmtDate(r.peak_day)}</td>
                <td className="py-2 pr-4">{fmtNum(r.peak_downloads)}</td>
                <td className="py-2 pr-4">{r.ios_pct??0}%</td>
                <td className="py-2 pr-4">{r.android_pct??0}%</td>
                <td className="py-2 text-gray-400">{r.country_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
