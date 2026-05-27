'use client'
import { useState } from 'react'
import type { FieldDiff } from '@/lib/scrapers/types'

type FieldChoice = 'keep' | 'accept' | 'edit'

type Props = {
  fieldName: string
  diff: FieldDiff
  entityType: string
  entityId: number
  onChange: (fieldName: string, choice: FieldChoice, editedValue: string) => void
}

const FIELD_LABELS: Record<string, string> = {
  bio: 'Bio',
  description: 'Description',
  genre: 'Genre',
  imageUrl: 'Image URL',
  runtime: 'Runtime (min)',
  year: 'Year',
  releaseDate: 'Release Date',
  nationality: 'Nationality',
  birthplace: 'Birthplace',
  notableAchievement: 'Notable Achievement',
}

function isUrl(v: string | null): v is string {
  return !!v && (v.startsWith('http://') || v.startsWith('https://'))
}

export function DiffRow({ fieldName, diff, entityType, entityId, onChange }: Props) {
  const [choice, setChoice] = useState<FieldChoice>('accept')
  const [editValue, setEditValue] = useState(diff.scraped ?? '')
  const [scrapedUrl, setScrapedUrl] = useState(diff.scraped)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleChoice(c: FieldChoice) {
    setChoice(c)
    onChange(fieldName, c, editValue)
  }

  function handleEdit(v: string) {
    setEditValue(v)
    onChange(fieldName, 'edit', v)
  }

  async function handleUpload() {
    if (!scrapedUrl) return
    setUploading(true)
    setUploadError(null)
    try {
      const res = await fetch('/api/admin/scrape/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, imageUrl: scrapedUrl }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setScrapedUrl(data.url)
      setEditValue(data.url)
      onChange(fieldName, 'accept', data.url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
  }

  const label = FIELD_LABELS[fieldName] ?? fieldName
  const isImage = fieldName === 'imageUrl'

  return (
    <div className="border-b border-cream-border dark:border-warm-700 py-3 last:border-b-0">
      <p className="text-xs font-medium text-warm-600 dark:text-warm-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div>
          <p className="text-warm-500 mb-1">Current</p>
          {isImage && isUrl(diff.current) ? (
            <img src={diff.current} alt="current" className="h-20 w-auto rounded object-cover border border-cream-border dark:border-warm-700" />
          ) : (
            <p className="text-warm-700 dark:text-warm-300 bg-cream dark:bg-warm-800 rounded p-2 min-h-8 break-words">
              {diff.current ?? <em className="text-warm-500">empty</em>}
            </p>
          )}
        </div>
        <div>
          <p className="text-warm-500 mb-1">Scraped</p>
          {isImage && isUrl(scrapedUrl) ? (
            <img src={scrapedUrl} alt="scraped" className="h-20 w-auto rounded object-cover border border-cream-border dark:border-warm-700" />
          ) : (
            <p className="text-warm-700 dark:text-warm-300 bg-cream dark:bg-warm-800 rounded p-2 min-h-8 break-words">
              {scrapedUrl ?? <em className="text-warm-500">empty</em>}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(['keep', 'accept', 'edit'] as FieldChoice[]).map(c => (
          <button
            key={c}
            onClick={() => handleChoice(c)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              choice === c
                ? 'bg-steve text-cream border-steve'
                : 'border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve'
            }`}
          >
            {c === 'keep' ? 'Keep current' : c === 'accept' ? 'Use scraped' : 'Edit'}
          </button>
        ))}

        {isImage && isUrl(scrapedUrl) && choice !== 'keep' && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="text-xs px-3 py-1 rounded border border-cream-border dark:border-warm-700 text-warm-600 dark:text-warm-500 hover:border-steve transition-colors disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : 'Upload to ImageKit'}
          </button>
        )}
      </div>

      {uploadError && <p className="text-xs text-steve mt-1">{uploadError}</p>}

      {choice === 'edit' && (
        <textarea
          value={editValue}
          onChange={e => handleEdit(e.target.value)}
          className="mt-2 w-full text-xs border border-cream-border dark:border-warm-700 rounded-lg p-2 bg-cream dark:bg-warm-800 text-warm-900 dark:text-warm-200 resize-y min-h-16 focus:outline-none focus:border-steve"
        />
      )}
    </div>
  )
}
