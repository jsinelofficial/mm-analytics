import { NextRequest, NextResponse } from 'next/server'
import { getPopComparison, getPeriodSummary, getCountrySummary, getAnomalies } from '@/lib/queries'
import type { Platform } from '@/lib/types'

const PROMPTS: Record<string, (app: string) => string> = {
  performance: app => `Analyze download performance for ${app === 'all' ? 'all apps' : app} in this period. Cover: 1) headline download number and trend vs prior period, 2) PoP % and what it signals, 3) top country drivers with specific %s, 4) iOS vs Android split insight, 5) one prioritized growth recommendation. Use exact numbers.`,
  anomaly:     app => `Review the anomaly data for ${app === 'all' ? 'all apps' : app}. Identify: 1) the most significant spike or drop with exact date, magnitude, and z-score, 2) which platform and geography drove it, 3) likely causes — product launch, market event, competitor move, or seasonality, 4) whether it signals a real trend change. Cite specific z-scores and % deviations.`,
  competitor:  _   => `Compare all apps in the dataset. Cover: 1) the PoP winner and what their growth means strategically for MetaMask, 2) where MetaMask is gaining or losing share specifically, 3) the most concerning competitive trajectory and why, 4) two specific actions for MetaMask's growth team. Use exact numbers.`,
  country:     app => `Deep-dive on country performance for ${app === 'all' ? 'MetaMask' : app}. Cover: 1) top 3 markets by volume with contribution %, 2) iOS vs Android split by market where notable, 3) any geographic concentration risk, 4) the single highest-opportunity market with a concrete localization or ASO recommendation.`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { from, to, plat, app, type, question, history } = body
    const platform = (plat as Platform) || null

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    // ── Fetch data context ──────────────────────────────────────────────────
    const [pop, summary, anomalies] = await Promise.all([
      getPopComparison(from, to, platform),
      getPeriodSummary(from, to, platform),
      getAnomalies(from, to, app === 'all' ? undefined : app).catch(() => []),
    ])

    let countries: any[] = []
    try { countries = await getCountrySummary(app === 'all' ? 'MetaMask' : app, from, to, platform, 8) } catch {}

    const ctx = {
      period: { from, to, platform: plat || 'all' },
      pop_comparison: pop,
      period_summary: summary,
      top_anomalies: anomalies.slice(0, 10),
      top_countries: countries,
    }

    // ── SENTIMENT mode ──────────────────────────────────────────────────────
    if (type === 'sentiment') {
      const sentimentPrompt = `You are analyzing MetaMask app store download data for ${from} to ${to}.

Data context:
${JSON.stringify(ctx, null, 2)}

Generate a sentiment & context analysis for this period. Break the period into 2-4 meaningful sub-periods based on what the data shows (e.g. by quarter or by notable trend shifts).

For each sub-period, respond ONLY with a valid JSON array like this (no markdown, no explanation, just the array):
[
  {
    "label": "Jan–Mar 2026",
    "positive": 62,
    "neutral": 21,
    "negative": 17,
    "themes": ["Solana support launch", "swap fees (negative)", "security trust"],
    "insight": "Strong positive sentiment correlates with the iOS spike in late March. Swap fee complaints remain the most common negative theme."
  }
]

Base the sentiment percentages and themes on the actual download patterns, anomalies, and timing visible in the data. Make the themes specific and relevant to what's actually in the data. Keep insights to one sentence each.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: 'You are a data analyst. Respond only with valid JSON arrays. No markdown, no explanation.',
          messages: [{ role: 'user', content: sentimentPrompt }],
        }),
      })
      const d = await res.json()
      const text = d.content?.[0]?.text || '[]'
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const periods = JSON.parse(clean)
        return NextResponse.json({ periods })
      } catch {
        return NextResponse.json({ periods: [], error: 'Could not parse sentiment response' })
      }
    }

    // ── CHAT mode ───────────────────────────────────────────────────────────
    if (type === 'chat') {
      const systemPrompt = `You are a senior growth analyst AI for MetaMask, a leading crypto wallet. You have access to real app store download data for the period ${from} to ${to}.

Key data context:
- Apps tracked: ${[...new Set(pop.map(r => r.app_name))].join(', ')}
- MetaMask downloads this period: ${pop.find(r => r.app_name === 'MetaMask')?.current_downloads?.toLocaleString() || 'N/A'}
- MetaMask PoP growth: ${pop.find(r => r.app_name === 'MetaMask')?.pop_pct ?? 'N/A'}%
- Top MetaMask market: ${countries[0]?.country_name || 'N/A'} (${countries[0]?.contribution_pct || 0}%)

Full data:
${JSON.stringify(ctx, null, 2)}

Answer questions concisely and specifically using the actual numbers from the data. When you don't know something that would require external data (like news events), say so clearly and work with what's in the data. Keep answers under 200 words. Use bullet points for multi-part answers.`

      // Build messages array for multi-turn chat
      const chatMessages = [
        ...(history || []).slice(-6),
        ...(history?.length ? [] : [{ role: 'user', content: question }]),
      ]

      // If history is provided and last message is user, that's our question
      const messagesForApi = history?.length
        ? history.slice(-6).map((m: any) => ({ role: m.role, content: m.content }))
        : [{ role: 'user', content: question }]

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: systemPrompt,
          messages: messagesForApi,
        }),
      })
      const d = await res.json()
      const insight = d.content?.[0]?.text || 'No response generated.'
      return NextResponse.json({ insight })
    }



    // ── AUTO INSIGHTS mode ──────────────────────────────────────────────────
    if (type === 'auto_insights') {
      const prompt = `You are a senior growth analyst for MetaMask. Analyze this app store download data for ${from} to ${to} and generate exactly 5 strategic insights.

Data:
${JSON.stringify(ctx, null, 2)}

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "type": "growth_driver",
    "title": "Short title",
    "body": "1-2 sentence insight with **bold** key facts and specific numbers from the data.",
    "meta": "Key: Value · Key: Value · Key: Value",
    "accent": "green"
  }
]

Types to use (one each): growth_driver, competitive_gap, market_position, trend_alert, geography_opportunity
Accents: green=positive/growth, red=negative/risk, blue=neutral/position, amber=warning/alert, purple=opportunity
Make body specific with real numbers from the data. Keep meta to 3 short key:value pairs.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: 'You are a data analyst. Respond only with valid JSON arrays. No markdown, no preamble.',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const d = await res.json()
      const text = d.content?.[0]?.text || '[]'
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const insights = JSON.parse(clean)
        return NextResponse.json({ insights })
      } catch {
        return NextResponse.json({ insights: [] })
      }
    }

    // ── ANOMALY CARDS mode ──────────────────────────────────────────────────
    if (type === 'anomaly_cards') {
      const prompt = `You are analyzing MetaMask app store download data from ${from} to ${to}.

Data:
${JSON.stringify(ctx, null, 2)}

Generate 5 significant anomaly insights from this data. Each should describe a notable spike or drop with market context.

Respond ONLY with a valid JSON array (no markdown):
[
  {
    "date": "2026-01",
    "app": "MetaMask",
    "downloads": 850000,
    "change_pct": 18.3,
    "context": "Brief explanation of what drove this movement — market events, product launches, competitor activity.",
    "type": "spike"
  }
]

Use "spike" for positive movements, "drop" for negative. Make context specific and insightful based on the actual data patterns. Date should be YYYY-MM format.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: 'You are a data analyst. Respond only with valid JSON arrays. No markdown, no explanation.',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const d = await res.json()
      const text = d.content?.[0]?.text || '[]'
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const insights = JSON.parse(clean)
        return NextResponse.json({ insights })
      } catch {
        return NextResponse.json({ insights: [] })
      }
    }

    // ── Standard insight modes ──────────────────────────────────────────────
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a senior growth analyst for MetaMask. Give specific, data-driven analysis using exact numbers. Max 220 words. Use numbered points. Be direct and actionable.',
        messages: [{ role: 'user', content: `Data for ${from} to ${to}:\n\n${JSON.stringify(ctx, null, 2)}\n\n${PROMPTS[type]?.(app) || PROMPTS.performance(app)}` }],
      }),
    })
    const data = await res.json()
    const insight = data.content?.[0]?.text || 'No response generated.'
    return NextResponse.json({ insight })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
