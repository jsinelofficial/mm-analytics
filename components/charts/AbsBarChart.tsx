'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import type { PopComparison } from '@/lib/types'
import { APP_COLORS, fmtNum } from '@/lib/types'

export default function AbsBarChart({ data }: { data: PopComparison[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
          tickFormatter={fmtNum} />
        <YAxis type="category" dataKey="app_name" tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false} axisLine={false} width={80} />
        <Tooltip
          formatter={(v: any) => [fmtNum(v), 'Downloads']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="current_downloads" radius={[0, 4, 4, 0]}>
          {data.map(r => (
            <Cell key={r.app_name} fill={APP_COLORS[r.app_name] || '#9CA3AF'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
