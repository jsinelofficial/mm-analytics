'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Users2, Globe,
  AlertTriangle, Lightbulb, Upload
} from 'lucide-react'

const NAV = [
  { label: 'Overview', items: [
    { href: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { label: 'Analysis', items: [
    { href: '/trends',      icon: TrendingUp,      label: 'Trends' },
    { href: '/competitors', icon: Users2,           label: 'Competitors' },
    { href: '/countries',   icon: Globe,            label: 'Countries' },
    { href: '/anomalies',   icon: AlertTriangle,    label: 'Anomalies' },
  ]},
  { label: 'Insights', items: [
    { href: '/insights',    icon: Lightbulb,        label: 'AI Insights' },
  ]},
  { label: 'Data', items: [
    { href: '/upload',      icon: Upload,           label: 'Upload' },
  ]},
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-[210px] shrink-0 flex flex-col h-screen"
      style={{ background: '#1A1A2E', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Fox icon from official MetaMask CDN */}
        <img
          src="https://images.ctfassets.net/clixtyxoaeas/4rnpEzy1ATWRKVBOLxZ1Fm/a74dc1eed36d23d7ea6030383a4d5163/MetaMask-icon-fox.svg"
          alt="MetaMask"
          width={28}
          height={28}
          className="shrink-0"
        />
        <div>
          <div className="text-[13px] font-semibold text-white leading-tight">MM Analytics</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Live · Supabase</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map(section => (
          <div key={section.label} className="mb-2">
            <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              {section.label}
            </p>
            {section.items.map(item => {
              const active = path === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] transition-all mx-2 rounded-lg mb-0.5"
                  style={active ? {
                    background: 'rgba(255,92,22,0.15)',
                    color: '#FFA680',
                  } : {
                    color: 'rgba(255,255,255,0.5)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
                >
                  {active && (
                    <span className="absolute left-0 w-0.5 h-5 rounded-r"
                      style={{ background: '#FF5C16' }} />
                  )}
                  <item.icon size={13} className="shrink-0" />
                  {item.label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: '#FF5C16' }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          MetaMask Growth Team
        </p>
      </div>
    </aside>
  )
}
