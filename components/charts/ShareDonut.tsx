'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { PeriodSummary } from '@/lib/types'
import { APP_COLORS, fmtNum } from '@/lib/types'

export default function ShareDonut({ data }: { data: PeriodSummary[] }) {
  const grand = data.reduce((s, r) => s + r.total_downloads, 0)

  return (
    <div>
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie data={data} dataKey="total_downloads" nameKey="app_name"
            cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2}>
            {data.map(entry => (
              <Cell key={entry.app_name} fill={APP_COLORS[entry.app_name] || '#9CA3AF'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: any, name: any) =>
              [`${fmtNum(val)} (${grand > 0 ? (val / grand * 100).toFixed(1) : 0}%)`, name]}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 mt-1">
        {data.map(r => (
          <div key={r.app_name} className="flex justify-between text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ background: APP_COLORS[r.app_name] || '#9CA3AF' }} />
              {r.app_name}
            </span>
            <span className="text-gray-400">
              {grand > 0 ? (r.total_downloads / grand * 100).toFixed(1) : 0}% · {fmtNum(r.total_downloads)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
