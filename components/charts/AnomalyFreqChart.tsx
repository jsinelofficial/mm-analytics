'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import type { Anomaly } from '@/lib/types'

interface Props { anomalies: Anomaly[]; apps: string[] }

export default function AnomalyFreqChart({ anomalies, apps }: Props) {
  const data = apps.map(app => ({
    app,
    spikes: anomalies.filter(r => r.app_name === app && r.anomaly_type === 'spike').length,
    drops:  anomalies.filter(r => r.app_name === app && r.anomaly_type === 'drop').length,
  })).filter(r => r.spikes + r.drops > 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="app" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={24} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Bar dataKey="spikes" name="Spikes" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
        <Bar dataKey="drops"  name="Drops"  stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
