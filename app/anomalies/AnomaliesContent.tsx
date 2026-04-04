'use client'

import { useEffect, useState } from 'react'
import { getAnomalies, getDailyDownloads } from '@/lib/queries'
import { fmtNum, fmtDate, ALL_APPS } from '@/lib/types'
import type { Anomaly, DailyDownload } from '@/lib/types'
import TrendChart from '@/components/charts/TrendChart'
import AnomalyFreqChart from '@/components/charts/AnomalyFreqChart'
import KpiCard from '@/components/KpiCard'
import { Loader2 } from 'lucide-react'

interface AnomalyInsight {
  date: string
  app: string
  downloads: number
  change_pct: number
  context: string
  type: 'spike' | 'drop'
}

interface Props { from: string; to: string; plat: string; app: string }

export default function AnomaliesContent({ from, to, plat, app }: Props) {
  const [allAnoms,   setAllAnoms]   = useState<Anomaly[]>([])
  const [mmAnoms,    setMmAnoms]    = useState<Anomaly[]>([])
  const [mmTrend,    setMmTrend]    = useState<DailyDownload[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [aiInsights, setAiInsights] = useState<AnomalyInsight[]>([])
  const [aiLoading,  setAiLoading]  = useState(false)

  useEffect(() => {
    setLoading(true); setError('')
    setAiInsights([])
    Promise.all([
      getAnomalies(from, to, app || undefined),
      getAnomalies(from, to, 'MetaMask'),
      getDailyDownloads(from, to, 'MetaMask'),
    ]).then(([all, mm, tr]) => {
      setAllAnoms(all); setMmAnoms(mm); setMmTrend(tr); setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [from, to, app])

  async function generateAiInsights() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, plat: plat || null, app: 'all', type: 'anomaly_cards' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setAiInsights(d.insights || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return <div className="p-5 grid grid-cols-4 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="bg-white border border-gray-100 rounded-xl h-20 animate-pulse"/>)}</div>
  if (error)   return <div className="p-6 text-sm text-red-500">Error: {error}</div>

  const spikes = allAnoms.filter(r => r.anomaly_type === 'spike')
  const drops  = allAnoms.filter(r => r.anomaly_type === 'drop')
  const biggestSpike = [...spikes].sort((a,b) => b.z_score - a.z_score)[0]
  const worstDrop    = [...drops].sort((a,b) => a.z_score - b.z_score)[0]

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Total spikes" value={String(spikes.length)}
          meta={`across ${new Set(spikes.map(r=>r.app_name)).size} apps`} trend="up" />
        <KpiCard label="Total drops" value={String(drops.length)}
          meta={`across ${new Set(drops.map(r=>r.app_name)).size} apps`} trend="down" />
        <KpiCard label="Biggest spike"
          value={biggestSpike ? `z=${biggestSpike.z_score}` : '—'}
          meta={biggestSpike ? `${biggestSpike.app_name} · ${fmtDate(biggestSpike.date)}` : ''} />
        <KpiCard label="Worst drop"
          value={worstDrop ? `z=${worstDrop.z_score}` : '—'}
          meta={worstDrop ? `${worstDrop.app_name} · ${fmtDate(worstDrop.date)}` : ''} />
      </div>

      {/* AI Anomaly Detection panel */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #F0F0F0', background: '#fff' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Anomaly Detection</p>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#9CA3AF' }}>Unusual spikes & drops flagged</p>
          </div>
          {aiInsights.length === 0 && !aiLoading && (
            <button onClick={generateAiInsights}
              className="text-[11px] font-medium px-4 py-2 rounded-lg text-white"
              style={{ background: '#FF5C16' }}>
              Generate AI insights ↗
            </button>
          )}
          {aiLoading && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: '#9CA3AF' }}>
              <Loader2 size={13} className="animate-spin" style={{ color: '#FF5C16' }} />
              Analyzing anomalies...
            </div>
          )}
          {aiInsights.length > 0 && !aiLoading && (
            <button onClick={generateAiInsights}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
              Regenerate
            </button>
          )}
        </div>

        {/* AI insight cards */}
        {aiInsights.length > 0 && (
          <div className="divide-y" style={{ borderColor: '#F0F0F0' }}>
            {aiInsights.map((ins, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                {/* Date badge */}
                <div className="shrink-0 text-center">
                  <div className="text-[11px] font-mono font-semibold px-2 py-1 rounded"
                    style={{
                      background: ins.type === 'spike' ? '#F0FDF4' : '#FEF2F2',
                      color: ins.type === 'spike' ? '#059669' : '#DC2626',
                      border: `1px solid ${ins.type === 'spike' ? '#BBF7D0' : '#FECACA'}`
                    }}>
                    {ins.date}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-gray-900">
                      {ins.app} — {fmtNum(ins.downloads)} downloads
                    </span>
                    <span className="text-[11px] font-semibold"
                      style={{ color: ins.change_pct > 0 ? '#059669' : '#DC2626' }}>
                      ({ins.change_pct > 0 ? '+' : ''}{ins.change_pct.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#6B7280' }}>
                    {ins.context}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback: raw anomaly log when no AI insights */}
        {aiInsights.length === 0 && !aiLoading && (
          <div className="divide-y" style={{ borderColor: '#F9F9F9' }}>
            {allAnoms.slice(0, 15).map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.anomaly_type==='spike'?'bg-emerald-500':'bg-red-500'}`}/>
                <span className="font-mono text-[10px] w-20 shrink-0" style={{ color: '#9CA3AF' }}>{fmtDate(r.date)}</span>
                <span className="flex-1 truncate text-gray-700">{r.app_name} · {r.platform}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.anomaly_type==='spike'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
                  {r.anomaly_type}
                </span>
                <span className="font-medium w-16 text-right">{fmtNum(r.downloads)}</span>
                <span style={{ color: '#9CA3AF' }} className="w-14 text-right">z={r.z_score}</span>
                <span className={`w-16 text-right font-medium ${r.deviation_pct>0?'text-emerald-600':'text-red-500'}`}>
                  {r.deviation_pct>0?'+':''}{r.deviation_pct}%
                </span>
              </div>
            ))}
            {allAnoms.length === 0 && <p className="text-center py-8 text-[11px]" style={{ color: '#9CA3AF' }}>No anomalies in this period</p>}
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-semibold text-gray-900 mb-1">Anomaly frequency by app</p>
          <p className="text-[10px] mb-3" style={{ color: '#9CA3AF' }}>Spike vs drop count · selected period</p>
          <AnomalyFreqChart anomalies={allAnoms} apps={ALL_APPS} />
          <div className="flex gap-4 mt-3 text-[10px]" style={{ color: '#9CA3AF' }}>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block"/>Spikes</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block"/>Drops</span>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-[12px] font-semibold text-gray-900 mb-1">MetaMask — downloads with anomalies</p>
          <p className="text-[10px] mb-3" style={{ color: '#9CA3AF' }}>Amber = spike · Red = drop</p>
          <TrendChart data={mmTrend} anomalies={mmAnoms} height={200} />
        </div>
      </div>
    </div>
  )
}
