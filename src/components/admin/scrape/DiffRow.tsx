'use client'
import { useState } from 'react'
import type { FieldDiff } from '@/lib/scrapers/types'

type FieldChoice = 'keep' | 'accept' | 'edit'

type Props = {
  fieldName: string
  diff: FieldDiff
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

export function DiffRow({ fieldName, diff, onChange }: Props) {
  const [choice, setChoice] = useState<FieldChoice>('accept')
  const [editValue, setEditValue] = useState(diff.scraped ?? '')

  function handleChoice(c: FieldChoice) {
    setChoice(c)
    onChange(fieldName, c, editValue)
  }

  function handleEdit(v: string) {
    setEditValue(v)
    onChange(fieldName, 'edit', v)
  }

  const label = FIELD_LABELS[fieldName] ?? fieldName

  return (
    <div className="border-b border-cream-border dark:border-warm-700 py-3 last:border-b-0">
      <p className="text-xs font-medium text-warm-600 dark:text-warm-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div>
          <p className="text-warm-500 mb-1">Current</p>
          <p className="text-warm-700 dark:text-warm-300 bg-cream dark:bg-warm-800 rounded p-2 min-h-8 break-words">
            {diff.current ?? <em className="text-warm-500">empty</em>}
          </p>
        </div>
        <div>
          <p className="text-warm-500 mb-1">Scraped</p>
          <p className="text-warm-700 dark:text-warm-300 bg-cream dark:bg-warm-800 rounded p-2 min-h-8 break-words">
            {diff.scraped ?? <em className="text-warm-500">empty</em>}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
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
      </div>

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
