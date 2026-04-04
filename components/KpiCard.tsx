interface KpiCardProps {
  label: string
  value: string
  meta?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: string
}

export default function KpiCard({ label, value, meta, trend, accent }: KpiCardProps) {
  const trendColor = trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : '#9CA3AF'

  return (
    <div className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid #F0F0F0',
        borderTop: accent ? `3px solid ${accent}` : '1px solid #F0F0F0',
      }}>
      {/* Subtle orange glow in top right if it's MetaMask's own card */}
      {accent === '#FF5C16' && (
        <div className="absolute top-0 right-0 w-16 h-16 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,92,22,0.08) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
      )}
      <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5"
        style={{ color: '#9CA3AF' }}>{label}</p>
      <p className="text-[22px] font-bold leading-tight mb-1"
        style={{ color: trend ? trendColor : '#111827' }}>{value}</p>
      {meta && <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{meta}</p>}
    </div>
  )
}
