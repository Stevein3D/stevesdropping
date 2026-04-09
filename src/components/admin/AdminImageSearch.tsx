'use client'
import { useState } from 'react'
import { ImageUploadButton } from './ImageUploadButton'

type Record = {
  id:       number
  name:     string
  imageUrl: string | null
  featured?: boolean
}

type Props = {
  records:    Record[]
  entity:     'person' | 'character' | 'title' | 'casting'
  folder:     string
  fileNameFn?: (r: Record) => string
  labelFn?:   (r: Record) => string
}

export function AdminImageSearch({
  records,
  entity,
  folder,
  fileNameFn = (r) => `${r.id}.jpg`,
  labelFn    = (r) => r.name,
}: Props) {
  const [query, setQuery]             = useState('')
  const [showcasedOnly, setShowcasedOnly] = useState(false)

  const filtered = records.filter((r) => {
    if (showcasedOnly && !r.featured) return false
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return r.name.toLowerCase().includes(q) || String(r.id).includes(q)
  })

  const featuredCount = records.filter((r) => r.featured).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative w-64">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 placeholder-warm-500 focus:outline-none focus:border-steve"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-steve transition-colors"
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-warm-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>

        {/* Showcased filter — only for entities that support it */}
        {entity !== 'casting' && (
          <button
            onClick={() => setShowcasedOnly((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
              showcasedOnly
                ? 'border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400'
                : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill={showcasedOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
            </svg>
            Showcased
            {featuredCount > 0 && (
              <span className="ml-0.5 text-[10px] bg-amber-400/20 px-1 rounded-full">{featuredCount}</span>
            )}
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-warm-500 py-4">
          {showcasedOnly ? 'No showcased entries yet.' : `No results for "${query}"`}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((record) => (
          <ImageUploadButton
            key={record.id}
            entity={entity}
            id={record.id}
            folder={folder}
            fileName={fileNameFn(record)}
            currentUrl={record.imageUrl}
            label={labelFn(record)}
            featured={record.featured ?? false}
          />
        ))}
      </div>

      {(query || showcasedOnly) && filtered.length > 0 && (
        <p className="text-xs text-warm-500">
          {filtered.length} of {records.length} shown
        </p>
      )}
    </div>
  )
}
