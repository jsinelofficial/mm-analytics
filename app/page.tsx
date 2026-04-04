import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import DashboardContent from './DashboardContent'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; plat?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const from = params.from || '2026-01-01'
  const to   = params.to   || '2026-03-31'
  const plat = params.plat || ''

  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="h-12 bg-white border-b border-gray-100" />}>
        <FilterBar title="Dashboard" badge={`${from} → ${to}`} />
      </Suspense>
      <Suspense fallback={<div className="p-6 grid grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="bg-white border border-gray-100 rounded-xl p-4 h-24 animate-pulse"/>)}</div>}>
        <DashboardContent from={from} to={to} plat={plat} />
      </Suspense>
    </div>
  )
}
