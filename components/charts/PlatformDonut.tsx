'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtNum } from '@/lib/types'

export default function PlatformDonut({ ios, android }: { ios: number; android: number }) {
  const total = ios + android
  const data = [
    { name: 'iOS',     value: ios },
    { name: 'Android', value: android },
  ]

  return (
    <ResponsiveContainer width="100%" height={110}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={2}>
          <Cell fill="#1D4ED8" />
          <Cell fill="#93C5FD" />
        </Pie>
        <Tooltip
          formatter={(val: any, name: any) =>
            [`${fmtNum(val)} (${total > 0 ? (val / total * 100).toFixed(1) : 0}%)`, name]}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
