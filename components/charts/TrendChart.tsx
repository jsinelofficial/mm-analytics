'use client'

import {
  ResponsiveContainer, ComposedChart, Line, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import type { DailyDownload, Anomaly } from '@/lib/types'
import { fmtNum } from '@/lib/types'

interface Props {
  data: DailyDownload[]
  anomalies?: Anomaly[]
  height?: number
}

export default function TrendChart({ data, anomalies = [], height = 200 }: Props) {
  const anomalyMap = new Map(anomalies.map(a => [a.date, a]))

  const chartData = data.map(d => {
    const anom = anomalyMap.get(d.date)
    return {
      date:     d.date.slice(5),
      fullDate: d.date,
      downloads: d.downloads,
      spike: anom?.anomaly_type === 'spike' ? d.downloads : null,
      drop:  anom?.anomaly_type === 'drop'  ? d.downloads : null,
      anomZ:    anom?.z_score ?? null,
      anomPct:  anom?.deviation_pct ?? null,
      anomType: anom?.anomaly_type ?? null,
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const dl = payload.find((p: any) => p.dataKey === 'downloads')
    const spike = payload.find((p: any) => p.dataKey === 'spike' && p.value != null)
    const drop  = payload.find((p: any) => p.dataKey === 'drop'  && p.value != null)
    const anom  = spike || drop

    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
        <p style={{ fontWeight: 500, marginBottom: 4 }}>{label}</p>
        {dl && <p style={{ color: '#1D4ED8' }}>Downloads: {fmtNum(dl.value)}</p>}
        {anom && anom.payload && (
          <p style={{ color: anom.dataKey === 'spike' ? '#D97706' : '#DC2626', marginTop: 2 }}>
            {anom.dataKey === 'spike' ? '▲ Spike' : '▼ Drop'}
            {anom.payload.anomZ != null ? ` · z=${anom.payload.anomZ}` : ''}
            {anom.payload.anomPct != null ? ` · ${anom.payload.anomPct > 0 ? '+' : ''}${anom.payload.anomPct}%` : ''}
          </p>
        )}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtNum}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="downloads"
          stroke="#FF5C16"
          strokeWidth={2}
          dot={false}
          name="Downloads"
        />
        <Scatter dataKey="spike" fill="#D97706" name="Spike" />
        <Scatter dataKey="drop"  fill="#DC2626" name="Drop"  />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
