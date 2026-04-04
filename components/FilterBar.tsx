'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface FilterBarProps {
  title: string
  badge?: string
}

export default function FilterBar({ title, badge }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const from = params.get('from') || '2026-01-01'
  const to   = params.get('to')   || '2026-03-31'
  const plat = params.get('plat') || ''

  const push = useCallback((updates: Record<string, string>) => {
    const p = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    router.push(`${pathname}?${p.toString()}`)
  }, [params, pathname, router])

  function preset(days: number) {
    const toDate = new Date('2026-03-31')
    const fromDate = new Date(toDate)
    fromDate.setDate(fromDate.getDate() - days + 1)
    push({ from: fromDate.toISOString().slice(0, 10), to: '2026-03-31' })
  }

  return (
    <div className="border-b flex items-center justify-between gap-3 flex-wrap px-6 py-2.5"
      style={{ background: '#fff', borderColor: '#F0F0F0' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-semibold text-gray-900">{title}</span>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: '#FFF4F0', color: '#FF5C16', border: '1px solid #FFD4C2' }}>
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={from} onChange={e => push({ from: e.target.value })}
          className="text-[11px] border rounded-lg px-2.5 py-1.5 text-gray-700 outline-none focus:border-orange-400"
          style={{ borderColor: '#E5E7EB' }} />
        <span className="text-[11px] text-gray-300">→</span>
        <input type="date" value={to} onChange={e => push({ to: e.target.value })}
          className="text-[11px] border rounded-lg px-2.5 py-1.5 text-gray-700 outline-none focus:border-orange-400"
          style={{ borderColor: '#E5E7EB' }} />

        <select value={plat} onChange={e => push({ plat: e.target.value })}
          className="text-[11px] border rounded-lg px-2.5 py-1.5 text-gray-700 outline-none"
          style={{ borderColor: '#E5E7EB' }}>
          <option value="">All platforms</option>
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
        </select>

        {[
          { label: '90d', fn: () => preset(90) },
          { label: '180d', fn: () => preset(180) },
          { label: 'YTD', fn: () => push({ from: '2026-01-01', to: '2026-03-31' }) },
        ].map(({ label, fn }) => (
          <button key={label} onClick={fn}
            className="text-[11px] rounded-lg px-3 py-1.5 font-medium transition-all"
            style={{ border: '1px solid #E5E7EB', color: '#6B7280', background: '#fff' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#FFF4F0'
              ;(e.currentTarget as HTMLElement).style.color = '#FF5C16'
              ;(e.currentTarget as HTMLElement).style.borderColor = '#FFD4C2'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = '#fff'
              ;(e.currentTarget as HTMLElement).style.color = '#6B7280'
              ;(e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'
            }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
