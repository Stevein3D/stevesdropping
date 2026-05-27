'use client'
import { useState } from 'react'
import { InitiationPanel } from '@/components/admin/scrape/InitiationPanel'
import { ResultsQueue } from '@/components/admin/scrape/ResultsQueue'

export default function ScrapePage() {
  const [queueKey, setQueueKey] = useState(0)

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pt-2 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-900 dark:text-warm-200">Scrape & Enrich</h1>
      </div>

      <InitiationPanel onComplete={() => setQueueKey(k => k + 1)} />

      <div key={queueKey}>
        <ResultsQueue />
      </div>
    </div>
  )
}
