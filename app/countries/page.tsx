import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import CountriesContent from './CountriesContent'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; plat?: string }>
}

export default async function CountriesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const from = params.from || '2026-01-01'
  const to   = params.to   || '2026-03-31'
  const plat = params.plat || ''
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="h-12 bg-white border-b border-gray-100" />}>
        <FilterBar title="Countries" badge={`${from} → ${to}`} />
      </Suspense>
      <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading...</div>}>
        <CountriesContent from={from} to={to} plat={plat} app="MetaMask" />
      </Suspense>
    </div>
  )
}
