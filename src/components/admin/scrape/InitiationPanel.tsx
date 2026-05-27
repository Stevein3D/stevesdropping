'use client'
import { useState } from 'react'

type Props = {
  onComplete: () => void
}

export function InitiationPanel({ onComplete }: Props) {
  const [entityType, setEntityType] = useState<'person' | 'title'>('person')
  const [filter, setFilter] = useState<'all' | 'empty'>('empty')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filter }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setResult({ created: data.created, skipped: data.skipped })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed')
    }
    setLoading(false)
  }

  return (
    <div className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-6 space-y-5">
      <h2 className="font-serif text-lg font-bold text-warm-900 dark:text-warm-200">Start Scrape</h2>

      <div className="flex gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs text-warm-600 dark:text-warm-500 tracking-wide uppercase">Entity Type</p>
          <div className="flex gap-2">
            {(['person', 'title'] as const).map(t => (
              <button
                key={t}
                onClick={() => setEntityType(t)}
                className={`text-sm px-4 py-1.5 rounded-lg border transition-colors capitalize ${
                  entityType === t
                    ? 'bg-steve text-cream border-steve'
                    : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve'
                }`}
              >
                {t === 'person' ? 'People' : 'Titles'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-warm-600 dark:text-warm-500 tracking-wide uppercase">Filter</p>
          <div className="flex gap-2">
            {(['empty', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${
                  filter === f
                    ? 'bg-steve text-cream border-steve'
                    : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve'
                }`}
              >
                {f === 'empty' ? 'Empty fields only' : 'All records'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-warm-500">Max 50 records per batch. Scrapes run in parallel.</p>

      <button
        onClick={handleStart}
        disabled={loading}
        className="bg-steve hover:bg-steve-hover text-cream text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-40"
      >
        {loading ? 'Scraping…' : 'Start Scrape'}
      </button>

      {result && (
        <p className="text-sm text-warm-600 dark:text-warm-500">
          Done — <span className="text-steve font-medium">{result.created} queued</span>, {result.skipped} not found
        </p>
      )}
      {error && <p className="text-sm text-steve">{error}</p>}
    </div>
  )
}
