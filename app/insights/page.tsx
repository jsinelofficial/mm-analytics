import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import InsightsPanel from './InsightsPanel'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; plat?: string }>
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const from = params.from || '2026-01-01'
  const to   = params.to   || '2026-03-31'
  const plat = params.plat || ''

  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="h-12 bg-white border-b border-gray-100" />}>
        <FilterBar title="AI Insights" badge="Claude · on demand" />
      </Suspense>
      <InsightsPanel from={from} to={to} plat={plat} />
    </div>
  )
}
