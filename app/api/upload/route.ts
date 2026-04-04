import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { rows, filename, triggerRefresh, totalRows } = await req.json()

    const { error } = await supabase
      .from('performance_events')
      .upsert(rows, {
        onConflict: 'date,canonical_app_name,platform,country_code',
        ignoreDuplicates: true,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Fire refresh webhook after the final chunk (triggerRefresh: true on last chunk)
    if (triggerRefresh) {
      fireRefreshWebhook({ filename, row_count: totalRows }).catch(e =>
        console.warn('[upload] Refresh webhook failed (non-fatal):', e.message)
      )
    }

    return NextResponse.json({ ok: true, count: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function fireRefreshWebhook(payload: { filename: string; row_count: number }) {
  const webhookUrl    = process.env.REFRESH_WEBHOOK_URL
  const webhookSecret = process.env.REFRESH_WEBHOOK_SECRET

  if (!webhookUrl) {
    console.log('[upload] REFRESH_WEBHOOK_URL not set — skipping refresh trigger')
    return
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (webhookSecret) headers['Authorization'] = `Bearer ${webhookSecret}`

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  console.log(`[upload] Refresh webhook → ${res.status} ${res.statusText}`)
}
