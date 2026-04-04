import { Suspense } from 'react'
import FilterBar from '@/components/FilterBar'
import UploadPanel from './UploadPanel'
import { supabase } from '@/lib/supabase'

export default async function UploadPage() {
  const { data: batches } = await supabase
    .from('upload_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="h-12 bg-white border-b border-gray-100" />}>
        <FilterBar title="Upload Data" badge="Sensor Tower exports" />
      </Suspense>
      <UploadPanel batches={batches || []} />
    </div>
  )
}
