'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function CountryAppPicker({ apps, selected }: { apps: string[]; selected: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const pathname = usePathname()

  function onChange(app: string) {
    const p = new URLSearchParams(params.toString())
    p.set('app', app)
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      className="text-[11px] border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-800"
    >
      {apps.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  )
}
