import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { filename, row_count, date_range_start, date_range_end } = await req.json()

    const { data, error } = await supabase
      .from('upload_batches')
      .insert({
        filename,
        row_count,
        date_range_start,
        date_range_end,
        status: 'complete',
      })
      .select()
      .single()

    if (error) {
      // Table may not exist yet — return gracefully so upload still succeeds
      console.warn('upload_batches insert failed:', error.message)
      return NextResponse.json({ batch: null })
    }

    return NextResponse.json({ batch: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
