'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import type { PopComparison } from '@/lib/types'
import { APP_COLORS } from '@/lib/types'

export default function PopBarChart({ data }: { data: PopComparison[] }) {
  const sorted = [...data].sort((a, b) => (b.pop_pct ?? 0) - (a.pop_pct ?? 0))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
          tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="app_name" tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false} axisLine={false} width={80} />
        <Tooltip
          formatter={(v: any) => [`${v >= 0 ? '+' : ''}${v}%`, 'PoP Growth']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="pop_pct" radius={[0, 4, 4, 0]}>
          {sorted.map(r => (
            <Cell key={r.app_name} fill={APP_COLORS[r.app_name] || '#9CA3AF'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
