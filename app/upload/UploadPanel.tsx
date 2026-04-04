'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Batch {
  id: string
  filename: string
  row_count: number
  date_range_start: string
  date_range_end: string
  status: string
  created_at: string
}

interface Props { batches: Batch[] }

type UploadState = 'idle' | 'parsing' | 'uploading' | 'success' | 'error'

export default function UploadPanel({ batches: initialBatches }: Props) {
  const [state,    setState]    = useState<UploadState>('idle')
  const [message,  setMessage]  = useState('')
  const [preview,  setPreview]  = useState<{ rows: number; dates: string[]; apps: string[] } | null>(null)
  const [batches,  setBatches]  = useState(initialBatches)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setState('parsing')
    setMessage('Parsing file...')
    setPreview(null)

    try {
      // Dynamically import xlsx (SheetJS) to avoid SSR issues
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const isCSV = file.name.toLowerCase().endsWith('.csv')
      const wb = XLSX.read(buffer, { type: 'array', cellDates: !isCSV, raw: isCSV })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: isCSV })

      if (!raw.length) throw new Error('File is empty')

      const cols = Object.keys(raw[0])

      // Auto-detect format:
      // Format A (raw Sensor Tower): Date, App Name, Platform, Country Code, Country Name, Downloads
      // Format B (pre-normalized):   date, canonical_app_name, platform, country_code, country_name, downloads
      const isFormatB = cols.includes('canonical_app_name') || (cols.includes('date') && cols.includes('downloads'))

      const REQUIRED_A = ['Date', 'App Name', 'Platform', 'Country Code', 'Country Name', 'Downloads']
      const REQUIRED_B = ['date', 'canonical_app_name', 'platform', 'country_code', 'country_name', 'downloads']
      const required = isFormatB ? REQUIRED_B : REQUIRED_A
      const missing = required.filter(c => !cols.includes(c))
      if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`)

      // Parse rows — handle both formats
      const rows = raw.map((r: any, i: number) => {
        let date: string, raw_app_name: string, canonical_app_name: string,
            platform: string, country_code: string, country_name: string, downloads: number

        if (isFormatB) {
          date               = r['date'] instanceof Date
            ? r['date'].toISOString().slice(0, 10)
            : String(r['date']).slice(0, 10)
          raw_app_name       = String(r['raw_app_name'] || r['canonical_app_name'])
          canonical_app_name = String(r['canonical_app_name'])
          platform           = String(r['platform'])
          country_code       = String(r['country_code']).toUpperCase()
          country_name       = String(r['country_name'])
          downloads          = parseInt(String(r['downloads']).replace(/,/g, ''), 10)
        } else {
          date = r['Date'] instanceof Date
            ? r['Date'].toISOString().slice(0, 10)
            : String(r['Date']).slice(0, 10)
          raw_app_name       = String(r['App Name'])
          canonical_app_name = String(r['App Name'])
          platform           = String(r['Platform'])
          country_code       = String(r['Country Code']).toUpperCase()
          country_name       = String(r['Country Name'])
          downloads          = parseInt(String(r['Downloads']).replace(/,/g, ''), 10)
        }

        if (!date || isNaN(downloads)) throw new Error(`Invalid data at row ${i + 2}`)
        return { date, raw_app_name, canonical_app_name, platform, country_code, country_name, downloads }
      })

      const dates = [...new Set(rows.map(r => r.date))].sort()
      const apps  = [...new Set(rows.map(r => r.raw_app_name))]
      setPreview({ rows: rows.length, dates, apps })

      setState('uploading')
      setMessage(`Uploading ${rows.length.toLocaleString()} rows...`)

      // Upload in chunks of 500
      const CHUNK = 500
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const isLastChunk = i + CHUNK >= rows.length
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk, filename: file.name, triggerRefresh: isLastChunk, totalRows: rows.length }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Upload failed')
        }
        setMessage(`Uploading... ${Math.min(i + CHUNK, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}`)
      }

      // Log batch
      const batchRes = await fetch('/api/upload/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          row_count: rows.length,
          date_range_start: dates[0],
          date_range_end: dates[dates.length - 1],
        }),
      })
      if (batchRes.ok) {
        const { batch } = await batchRes.json()
        setBatches(prev => [batch, ...prev])
      }

      setState('success')
      setMessage(`Successfully uploaded ${rows.length.toLocaleString()} rows from ${file.name}`)
    } catch (e: any) {
      setState('error')
      setMessage(e.message)
    }
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function reset() { setState('idle'); setMessage(''); setPreview(null); if (inputRef.current) inputRef.current.value = '' }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Drop zone */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[12px] font-medium mb-1">Upload Sensor Tower export</p>
        <p className="text-[10px] text-gray-400 mb-4">Accepts .xlsx and .csv — required columns: Date, App Name, Platform, Country Code, Country Name, Downloads</p>

        {state === 'idle' ? (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors
              ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload size={18} className="text-gray-400" />
            </div>
            <p className="text-[13px] font-medium text-gray-700">Drag & drop your Excel file here</p>
            <p className="text-[11px] text-gray-400">or click to browse — .xlsx or .csv</p>
            <input ref={inputRef} type="file" accept=".xlsx,.csv,.xls" onChange={onFileChange} className="hidden" />
          </div>
        ) : (() => {
          const isError   = state === ('error' as UploadState)
          const isSuccess = state === 'success'
          const isBusy    = state === 'parsing' || state === 'uploading'
          return (
            <div className="border border-gray-100 rounded-xl p-6 flex flex-col items-center gap-4">
              {isBusy    && <Loader2 size={28} className="text-blue-700 animate-spin" />}
              {isSuccess && <CheckCircle size={28} className="text-emerald-500" />}
              {isError   && <AlertCircle size={28} className="text-red-500" />}
              <p className={`text-[12px] font-medium ${isError ? 'text-red-600' : 'text-gray-700'}`}>{message}</p>
              {preview && (
                <div className="text-[11px] text-gray-500 text-center">
                  <p>{preview.rows.toLocaleString()} rows · {preview.apps.length} apps · {preview.dates.length} dates</p>
                  <p>{preview.dates[0]} → {preview.dates[preview.dates.length - 1]}</p>
                </div>
              )}
              {(isSuccess || isError) && (
                <button onClick={reset} className="text-[11px] border border-gray-200 rounded-lg px-4 py-1.5 hover:bg-gray-50">
                  Upload another file
                </button>
              )}
            </div>
          )
        })()}
      </div>

      {/* Upload history */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[12px] font-medium mb-3">Upload history</p>
        {batches.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-6">No uploads yet</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Filename','Date range','Rows','Uploaded','Status'].map(h => (
                  <th key={h} className="text-left pb-2 pr-4 text-[10px] text-gray-400 font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 flex items-center gap-1.5">
                    <FileSpreadsheet size={12} className="text-gray-400 shrink-0" />{b.filename}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{b.date_range_start} → {b.date_range_end}</td>
                  <td className="py-2 pr-4">{b.row_count?.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-gray-400">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="py-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      b.status === 'complete' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
