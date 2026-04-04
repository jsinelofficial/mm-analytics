'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import type { CountrySummary } from '@/lib/types'
import { fmtNum } from '@/lib/types'

export default function CountryBarChart({ data }: { data: CountrySummary[] }) {
  return (
    <ResponsiveContainer width="100%" height={370}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false}
          axisLine={false} tickFormatter={fmtNum} />
        <YAxis type="category" dataKey="country_name" tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false} axisLine={false} width={110} />
        <Tooltip
          formatter={(v: any) => [fmtNum(v), 'Downloads']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="downloads" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`rgba(255,92,22,${1 - i * 0.06})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
