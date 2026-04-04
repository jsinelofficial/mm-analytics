'use client'

import { useEffect, useState } from 'react'
import { getCountrySummary } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { fmtNum } from '@/lib/types'
import type { CountrySummary, Platform } from '@/lib/types'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts'

interface Props { from: string; to: string; plat: string; app: string }

const REGIONS: Record<string, string[]> = {
  'All Markets': [],
  'Americas':       ['US','CA','BR','MX','AR','CL','CO','PE','VE','EC','BO','PY','UY','CR','PA','DO','GT','HN','SV','NI','CU','JM','TT','BB','HT'],
  'Asia Pacific':   ['CN','JP','KR','IN','AU','NZ','SG','MY','TH','ID','PH','VN','HK','TW','PK','BD','LK','NP','MM','KH','LA','BN','PG','FJ','MN'],
  'EMEA':           ['GB','DE','FR','IT','ES','NL','BE','CH','AT','SE','NO','DK','FI','PL','CZ','HU','RO','BG','HR','SK','SI','LT','LV','EE','PT','GR','TR','RU','UA','IL','SA','AE','EG','ZA','NG','KE','GH','MA','TN','ET','CI','CM','SN'],
  'Southeast Asia': ['ID','PH','VN','TH','MY','SG','MM','KH','LA','BN','TL'],
}

export default function CountriesContent({ from, to, plat, app }: Props) {
  const [mmCountries,  setMmCountries]  = useState<CountrySummary[]>([])
  const [allCountries, setAllCountries] = useState<CountrySummary[]>([])
  const [activeRegion, setActiveRegion] = useState('All Markets')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    const platform = (plat as Platform) || null

    // Get MetaMask country data + all-apps country rollup
    Promise.all([
      getCountrySummary('MetaMask', from, to, platform, 30),
      // All-apps: query performance_events grouped by country
      supabase
        .from('v_performance')
        .select('country_code,country_name,downloads')
        .gte('date', from)
        .lte('date', to)
        .then(({ data }) => {
          if (!data) return []
          const map = new Map<string, { country_name: string; downloads: number }>()
          data.forEach(r => {
            const existing = map.get(r.country_code) || { country_name: r.country_name, downloads: 0 }
            existing.downloads += r.downloads || 0
            map.set(r.country_code, existing)
          })
          return Array.from(map.entries())
            .map(([country_code, v]) => ({ country_code, country_name: v.country_name, downloads: v.downloads }))
            .sort((a, b) => b.downloads - a.downloads)
            .slice(0, 20)
        })
    ]).then(([mm, all]) => {
      setMmCountries(mm)
      setAllCountries(all as any)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [from, to, plat])

  // Filter by region
  const regionCodes = REGIONS[activeRegion] || []
  const filterByRegion = <T extends { country_code: string }>(arr: T[]) =>
    regionCodes.length === 0 ? arr : arr.filter(r => regionCodes.includes(r.country_code))

  const filteredMM  = filterByRegion(mmCountries).slice(0, 10)
  const filteredAll = filterByRegion(allCountries).slice(0, 15)

  if (loading) return (
    <div className="p-5 flex flex-col gap-3">
      <div className="h-10 w-96 rounded-lg animate-pulse" style={{ background: '#e5e7eb' }} />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-96 rounded-xl animate-pulse" style={{ background: '#e5e7eb' }} />
        <div className="h-96 rounded-xl animate-pulse" style={{ background: '#e5e7eb' }} />
      </div>
    </div>
  )

  if (error) return <div className="p-6 text-sm text-red-500">Error: {error}</div>

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-semibold text-gray-900">Geographic Analysis</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">Downloads by country · MetaMask and competitors</p>
      </div>

      {/* Region tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(REGIONS).map(region => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            className="text-[12px] px-4 py-1.5 rounded-full font-medium transition-all"
            style={activeRegion === region ? {
              background: '#FF5C16',
              color: '#fff',
              border: '1px solid #FF5C16',
            } : {
              background: '#fff',
              color: '#6B7280',
              border: '1px solid #E5E7EB',
            }}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Chart grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: All apps combined */}
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #F0F0F0' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                Top {filteredAll.length} Markets — Total Downloads
              </p>
            </div>
            <span className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>
              All apps combined
            </span>
          </div>
          {filteredAll.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>No data for this region</p>
          ) : (
            <ResponsiveContainer width="100%" height={filteredAll.length * 36 + 20}>
              <BarChart data={filteredAll} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false} axisLine={false} tickFormatter={v => fmtNum(v)} />
                <YAxis type="category" dataKey="country_name" tick={{ fontSize: 11, fill: '#374151' }}
                  tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#111827' }}
                  formatter={(v: any) => [fmtNum(v), 'Downloads']}
                />
                <Bar dataKey="downloads" radius={[0, 4, 4, 0]}>
                  {filteredAll.map((_, i) => (
                    <Cell key={i} fill={`rgba(99,130,220,${1 - i * 0.04})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right: MetaMask only */}
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #F0F0F0' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                MetaMask Top {filteredMM.length} Countries
              </p>
            </div>
            <span className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>
              MetaMask downloads only
            </span>
          </div>
          {filteredMM.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>No data for this region</p>
          ) : (
            <ResponsiveContainer width="100%" height={filteredMM.length * 36 + 20}>
              <BarChart data={filteredMM} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }}
                  tickLine={false} axisLine={false} tickFormatter={v => fmtNum(v)} />
                <YAxis type="category" dataKey="country_name" tick={{ fontSize: 11, fill: '#374151' }}
                  tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#111827' }}
                  formatter={(v: any) => [fmtNum(v), 'Downloads']}
                />
                <Bar dataKey="downloads" radius={[0, 4, 4, 0]}>
                  {filteredMM.map((_, i) => (
                    <Cell key={i} fill={`rgba(255,92,22,${1 - i * 0.06})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Data table below */}
      <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #F0F0F0' }}>
        <p className="text-[12px] font-semibold text-gray-900 mb-3">
          MetaMask country detail — {activeRegion}
        </p>
        <table className="w-full text-[11px]">
          <thead>
            <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
              {['#', 'Country', 'Downloads', 'Share', 'iOS', 'Android'].map(h => (
                <th key={h} className="text-left pb-2 pr-4 text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: '#9CA3AF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filterByRegion(mmCountries).map((r, i) => (
              <tr key={r.country_code} style={{ borderBottom: '1px solid #F9F9F9' }}>
                <td className="py-1.5 pr-4" style={{ color: '#9CA3AF' }}>{i + 1}</td>
                <td className="py-1.5 pr-4 font-medium">{r.country_name}</td>
                <td className="py-1.5 pr-4 font-semibold">{fmtNum(r.downloads)}</td>
                <td className="py-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: '#F0F0F0' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${mmCountries[0]?.downloads > 0 ? Math.round(r.downloads / mmCountries[0].downloads * 100) : 0}%`,
                        background: '#FF5C16'
                      }} />
                    </div>
                    <span style={{ color: '#9CA3AF' }}>{r.contribution_pct}%</span>
                  </div>
                </td>
                <td className="py-1.5 pr-4" style={{ color: '#9CA3AF' }}>{fmtNum(r.ios_downloads)}</td>
                <td className="py-1.5" style={{ color: '#9CA3AF' }}>{fmtNum(r.android_downloads)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
