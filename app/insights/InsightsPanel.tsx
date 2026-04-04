'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, Send, TrendingUp, Globe, Users2, AlertTriangle } from 'lucide-react'
import { ALL_APPS } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface SentimentPeriod {
  label: string
  positive: number
  neutral: number
  negative: number
  themes: string[]
  insight: string
}

interface AutoInsight {
  type: 'growth_driver' | 'competitive_gap' | 'market_position' | 'trend_alert' | 'geography_opportunity'
  title: string
  body: string
  meta: string
  accent: 'green' | 'red' | 'blue' | 'amber' | 'purple'
}

interface Props { from: string; to: string; plat: string }

// ── Starter prompts ───────────────────────────────────────────────────────────
const STARTERS = [
  { icon: TrendingUp, label: 'Why did MetaMask downloads change this period?' },
  { icon: Users2,     label: 'How does MetaMask compare to Phantom and Trust Wallet?' },
  { icon: Globe,      label: 'Which countries should we double down on?' },
  { icon: AlertTriangle, label: 'Explain any unusual spikes or drops in this period' },
]

// ── Sentiment periods (AI-generated on demand) ────────────────────────────────
const SENTIMENT_TYPE_PROMPTS: Record<string, string> = {
  performance: 'performance summary',
  anomaly: 'anomaly and spike explanation',
  competitor: 'competitive analysis',
  country: 'country deep-dive',
}

export default function InsightsPanel({ from, to, plat }: Props) {
  const [messages,       setMessages]       = useState<Message[]>([])
  const [input,          setInput]          = useState('')
  const [chatLoading,    setChatLoading]    = useState(false)
  const [sentLoading,    setSentLoading]    = useState(false)
  const [sentPeriods,    setSentPeriods]    = useState<SentimentPeriod[]>([])
  const [sentError,      setSentError]      = useState('')
  const [hasInitialized, setHasInitialized] = useState(false)
  const [autoInsights,   setAutoInsights]   = useState<AutoInsight[]>([])
  const [autoLoading,    setAutoLoading]    = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize chat with a welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hello! I'm your AI analyst for MetaMask app performance data. I have access to your download data from ${from} to ${to}${plat ? ` on ${plat}` : ' across all platforms'}.\n\nAsk me anything about performance trends, competitor gaps, country opportunities, or what drove specific changes. For example:\n\n"Why did MetaMask downloads change this period?"\n"Which countries should we double down on?"\n"How does MetaMask compare to Trust Wallet in emerging markets?"`
    }])
    setHasInitialized(false)
    setSentPeriods([])
    setAutoInsights([])
  }, [from, to, plat])

  async function sendMessage(text?: string) {
    const userText = (text || input).trim()
    if (!userText || chatLoading) return

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setChatLoading(true)

    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to,
          plat: plat || null,
          app: 'all',
          type: 'chat',
          question: userText,
          history: newMessages.slice(-6), // last 6 messages for context
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: d.insight }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an error: ${e.message}` }])
    } finally {
      setChatLoading(false)
      inputRef.current?.focus()
    }
  }

  async function generateSentiment() {
    setSentLoading(true); setSentError('')
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, plat: plat || null, app: 'MetaMask', type: 'sentiment' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setSentPeriods(d.periods || [])
    } catch (e: any) {
      setSentError(e.message)
    } finally {
      setSentLoading(false)
    }
  }

  async function generateAutoInsights() {
    setAutoLoading(true)
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, plat: plat || null, app: 'all', type: 'auto_insights' }),
      })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setAutoInsights(d.insights || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setAutoLoading(false)
    }
  }

  const ACCENT_STYLES: Record<string, { bg: string; border: string; label: string; dot: string }> = {
    green:  { bg: '#F0FDF4', border: '#BBF7D0', label: '#059669', dot: '#059669' },
    red:    { bg: '#FEF2F2', border: '#FECACA', label: '#DC2626', dot: '#DC2626' },
    blue:   { bg: '#EFF6FF', border: '#BFDBFE', label: '#1D4ED8', dot: '#1D4ED8' },
    amber:  { bg: '#FFFBEB', border: '#FDE68A', label: '#D97706', dot: '#D97706' },
    purple: { bg: '#FAF5FF', border: '#E9D5FF', label: '#7C3AED', dot: '#7C3AED' },
  }

  const TYPE_LABELS: Record<string, string> = {
    growth_driver:         'Growth Driver',
    competitive_gap:       'Competitive Gap',
    market_position:       'Market Position',
    trend_alert:           'Trend Alert',
    geography_opportunity: 'Geography Opportunity',
  }

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* ── Chat section ──────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #F0F0F0', background: '#fff' }}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[13px]"
              style={{ background: '#FF5C16' }}>🦊</div>
            <span className="text-[13px] font-semibold text-gray-900">Ask the AI Analyst</span>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: '#FFF4F0', color: '#FF5C16', border: '1px solid #FFD4C2' }}>
            Powered by Claude
          </span>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-3 p-5 overflow-y-auto" style={{ minHeight: 280, maxHeight: 420 }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,92,22,0.1)' }}>
                  <span style={{ fontSize: 14 }}>🦊</span>
                </div>
              )}
              <div className="max-w-[80%] rounded-xl px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap"
                style={m.role === 'assistant' ? {
                  background: '#F8F8FA',
                  color: '#111827',
                  border: '1px solid #F0F0F0',
                } : {
                  background: '#FF5C16',
                  color: '#fff',
                }}>
                {m.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,92,22,0.1)' }}>
                <span style={{ fontSize: 14 }}>🦊</span>
              </div>
              <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                style={{ background: '#F8F8FA', border: '1px solid #F0F0F0' }}>
                <Loader2 size={13} className="animate-spin" style={{ color: '#FF5C16' }} />
                <span className="text-[12px]" style={{ color: '#9CA3AF' }}>Analyzing your data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Starter prompts — show only before first user message */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {STARTERS.map(s => (
              <button key={s.label} onClick={() => sendMessage(s.label)}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full transition-all"
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
                <s.icon size={11} />
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="px-5 pb-5 pt-2 flex gap-2.5">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about performance, competitors, countries, trends..."
            className="flex-1 text-[12px] px-4 py-2.5 rounded-xl outline-none"
            style={{ border: '1px solid #E5E7EB', background: '#F8F8FA', color: '#111827' }}
            disabled={chatLoading}
          />
          <button onClick={() => sendMessage()} disabled={chatLoading || !input.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-medium text-white transition-all disabled:opacity-50"
            style={{ background: '#FF5C16' }}>
            <Send size={13} />
            Send
          </button>
        </div>
      </div>


      {/* ── Auto-Generated Insights ───────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #F0F0F0', background: '#fff' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold text-gray-900">✦ Auto-Generated Insights</span>
          </div>
          <div className="flex items-center gap-3">
            {autoInsights.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live Analysis
              </div>
            )}
            {autoInsights.length === 0 && !autoLoading && (
              <button onClick={generateAutoInsights}
                className="text-[11px] font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: '#FF5C16' }}>
                Generate insights ↗
              </button>
            )}
            {autoLoading && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: '#9CA3AF' }}>
                <Loader2 size={13} className="animate-spin" style={{ color: '#FF5C16' }} />
                Generating...
              </div>
            )}
            {autoInsights.length > 0 && !autoLoading && (
              <button onClick={generateAutoInsights}
                className="text-[11px] px-3 py-1.5 rounded-lg"
                style={{ border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
                Refresh
              </button>
            )}
          </div>
        </div>

        {autoInsights.length === 0 && !autoLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: '#FFF4F0' }}>✦</div>
            <p className="text-[12px] font-medium text-gray-700">No insights generated yet</p>
            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
              Click "Generate insights" to get AI-powered analysis of your data for {from} → {to}
            </p>
          </div>
        )}

        {autoInsights.length > 0 && (
          <div className="p-5 flex flex-col gap-3">
            {autoInsights.map((ins, i) => {
              const style = ACCENT_STYLES[ins.accent] || ACCENT_STYLES.blue
              return (
                <div key={i} className="rounded-xl p-4"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style.dot }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: style.label }}>{TYPE_LABELS[ins.type] || ins.type}</span>
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 mb-1.5 leading-snug"
                    dangerouslySetInnerHTML={{ __html: ins.body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  <p className="text-[10px] font-mono" style={{ color: style.label }}>{ins.meta}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Sentiment & Context Analysis ──────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #F0F0F0', background: '#fff' }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Sentiment & Context Analysis</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
              Market events correlated with download movements
            </p>
          </div>
          {sentPeriods.length === 0 && !sentLoading && (
            <button onClick={generateSentiment}
              className="text-[11px] font-medium px-4 py-2 rounded-lg text-white transition-all"
              style={{ background: '#FF5C16' }}>
              Generate analysis ↗
            </button>
          )}
          {sentLoading && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: '#9CA3AF' }}>
              <Loader2 size={13} className="animate-spin" style={{ color: '#FF5C16' }} />
              Analyzing sentiment...
            </div>
          )}
          {sentPeriods.length > 0 && !sentLoading && (
            <button onClick={generateSentiment}
              className="text-[11px] px-3 py-1.5 rounded-lg transition-all"
              style={{ border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
              Regenerate
            </button>
          )}
        </div>

        {sentError && (
          <div className="mx-5 mt-4 px-3 py-2 rounded-lg text-[11px] text-red-600" style={{ background: '#FEF2F2' }}>
            {sentError}
          </div>
        )}

        {sentPeriods.length === 0 && !sentLoading && !sentError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: '#FFF4F0' }}>📊</div>
            <p className="text-[12px] font-medium text-gray-700">Sentiment not yet generated</p>
            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
              Click "Generate analysis" to correlate market sentiment with download data for {from} → {to}
            </p>
          </div>
        )}

        {sentPeriods.length > 0 && (
          <div className="p-5 flex flex-col gap-5">
            {sentPeriods.map((p, i) => (
              <div key={i} style={{ borderBottom: i < sentPeriods.length - 1 ? '1px solid #F0F0F0' : 'none', paddingBottom: i < sentPeriods.length - 1 ? 20 : 0 }}>
                {/* Period header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-gray-900">{p.label}</p>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="font-medium" style={{ color: '#059669' }}>▲ {p.positive}% Positive</span>
                    <span style={{ color: '#9CA3AF' }}>● {p.neutral}% Neutral</span>
                    <span className="font-medium" style={{ color: '#DC2626' }}>▼ {p.negative}% Negative</span>
                  </div>
                </div>

                {/* Sentiment bar */}
                <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
                  <div style={{ width: `${p.positive}%`, background: '#10B981', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ width: `${p.neutral}%`, background: '#F59E0B' }} />
                  <div style={{ width: `${p.negative}%`, background: '#EF4444', borderRadius: '0 4px 4px 0' }} />
                </div>

                {/* Theme chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {p.themes.map(theme => (
                    <span key={theme} className="text-[10px] px-2.5 py-1 rounded-full"
                      style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                      {theme}
                    </span>
                  ))}
                </div>

                {/* Insight text */}
                <p className="text-[11px] italic" style={{ color: '#9CA3AF' }}>{p.insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
