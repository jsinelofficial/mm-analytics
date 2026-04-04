'use client'

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import type { DailyDownload } from '@/lib/types'
import { APP_COLORS, fmtNum } from '@/lib/types'

interface Props { data: DailyDownload[]; height?: number }

export default function MultiTrendChart({ data, height = 240 }: Props) {
  // Pivot: date → { date, MetaMask: N, Phantom: N, ... }
  const dateMap = new Map<string, Record<string, number | string>>()
  const apps = new Set<string>()

  data.forEach(r => {
    apps.add(r.app_name)
    if (!dateMap.has(r.date)) dateMap.set(r.date, { date: r.date.slice(5) })
    dateMap.get(r.date)![r.app_name] = r.downloads
  })

  const chartData = Array.from(dateMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const appList = Array.from(apps)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false}
          axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
          tickFormatter={fmtNum} width={40} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v: any, name: any) => [fmtNum(v), name]}
        />
        {appList.map(app => (
          <Line key={app} type="monotone" dataKey={app}
            stroke={APP_COLORS[app] || '#9CA3AF'}
            strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
