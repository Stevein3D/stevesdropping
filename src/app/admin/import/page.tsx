'use client'
import { useRef, useState } from 'react'

type Summary = {
  people: number
  characters: number
  titles: number
  episodes: number
  castings: number
}

type Result =
  | { ok: true; summary: Summary }
  | { ok: false; error: string }

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null)
    setFile(e.target.files?.[0] ?? null)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: formData })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ ok: false, error: 'Network error — upload failed' })
    }

    setLoading(false)
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pt-2 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-900 dark:text-warm-200">Import Data</h1>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-warm-600 dark:text-warm-500">
          Upload your XLSX file. All five sheets (Person, Character, Title, Episode, Casting) will be
          upserted — existing records are updated, new records are added, nothing is deleted.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-cream-border dark:border-warm-700 rounded-lg p-8 text-center cursor-pointer hover:border-steve transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <p className="font-medium text-warm-900 dark:text-warm-200 text-sm">{file.name}</p>
              <p className="text-xs text-warm-500 mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-warm-600 dark:text-warm-500">Click to select an XLSX file</p>
              <p className="text-xs text-warm-500 mt-1">Expects sheets: Person, Character, Title, Episode, Casting</p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-steve hover:bg-steve-hover text-cream text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg border p-5 ${result.ok ? 'border-cream-border dark:border-warm-700 bg-cream-card dark:bg-warm-50/5' : 'border-steve bg-steve/5'}`}>
          {result.ok ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-warm-900 dark:text-warm-200">Import complete</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.summary).map(([key, count]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-warm-600 dark:text-warm-500 capitalize">{key}</span>
                    <span className="font-serif font-bold text-steve">{count} synced</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-steve">{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
