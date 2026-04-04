'use client'

import { useEffect, useState } from 'react'
import { getPopComparison, getDailyDownloads } from '@/lib/queries'
import { fmtNum, fmtPct, APP_COLORS } from '@/lib/types'
import type { PopComparison, DailyDownload, Platform } from '@/lib/types'
import KpiCard from '@/components/KpiCard'
import PopBarChart from '@/components/charts/PopBarChart'
import AbsBarChart from '@/components/charts/AbsBarChart'
import MultiTrendChart from '@/components/charts/MultiTrendChart'

interface Props { from: string; to: string; plat: string }

export default function CompetitorsContent({ from, to, plat }: Props) {
  const [pop,     setPop]     = useState<PopComparison[]>([])
  const [trend,   setTrend]   = useState<DailyDownload[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    const platform = (plat as Platform) || null
    Promise.all([
      getPopComparison(from, to, platform),
      getDailyDownloads(from, to),
    ]).then(([p, t]) => { setPop(p); setTrend(t); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [from, to, plat])

  if (loading) return <Skeleton />
  if (error)   return <div className="p-6 text-sm text-red-500">Error: {error}</div>

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${Math.min(pop.length,4)},minmax(0,1fr))`}}>
        {pop.slice(0,8).map(r => (
          <KpiCard key={r.app_name} label={r.app_name} value={fmtNum(r.current_downloads)}
            meta={`${fmtPct(r.pop_pct)} PoP`}
            trend={r.pop_pct==null?'neutral':r.pop_pct>0?'up':'down'}
            accent={APP_COLORS[r.app_name]} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-medium mb-1">PoP growth by app</p>
          <p className="text-[10px] text-gray-400 mb-3">f_pop_comparison()</p>
          <PopBarChart data={pop} />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-medium mb-1">Total downloads</p>
          <p className="text-[10px] text-gray-400 mb-3">Selected period</p>
          <AbsBarChart data={pop} />
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[12px] font-medium mb-1">Daily download trends — all apps</p>
        <div className="flex flex-wrap gap-3 mb-3">
          {Object.keys(APP_COLORS).map(app => (
            <span key={app} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{background:APP_COLORS[app]}} />{app}
            </span>
          ))}
        </div>
        <MultiTrendChart data={trend} height={220} />
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[12px] font-medium mb-3">Period-over-period comparison</p>
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-gray-100">
            {['App','Current','Prior','PoP %','Change','Daily avg','Prior avg'].map(h=>(
              <th key={h} className="text-left pb-2 pr-4 text-[10px] text-gray-400 font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pop.map(r => (
              <tr key={r.app_name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4"><span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{background:APP_COLORS[r.app_name]||'#9CA3AF'}}/>
                  {r.app_name}</span></td>
                <td className="py-2 pr-4 font-medium">{fmtNum(r.current_downloads)}</td>
                <td className="py-2 pr-4 text-gray-400">{fmtNum(r.prior_downloads)}</td>
                <td className="py-2 pr-4">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${r.pop_pct==null?'bg-gray-50 text-gray-400':r.pop_pct>0?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
                    {fmtPct(r.pop_pct)}
                  </span>
                </td>
                <td className={`py-2 pr-4 ${r.absolute_change>=0?'text-emerald-600':'text-red-500'}`}>
                  {r.absolute_change>=0?'+':''}{fmtNum(r.absolute_change)}
                </td>
                <td className="py-2 pr-4">{fmtNum(r.current_daily_avg)}</td>
                <td className="py-2 text-gray-400">{fmtNum(r.prior_daily_avg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Skeleton() {
  return <div className="p-5 grid grid-cols-4 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="bg-white border border-gray-100 rounded-xl h-20 animate-pulse"/>)}</div>
}
