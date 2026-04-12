'use client'
import { useState } from 'react'

type Props = { entity: 'person' | 'character' | 'title' | 'casting' }

export function PurgeCacheButton({ entity }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [detail, setDetail] = useState('')

  async function handlePurge() {
    if (status === 'loading') return
    setStatus('loading')
    setDetail('')
    try {
      const res = await fetch('/api/admin/purge-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('done')
        setDetail(`${data.purged} URLs cleared${data.failed > 0 ? `, ${data.failed} failed` : ''}`)
      } else {
        setStatus('error')
        setDetail(data.error ?? 'Unknown error')
      }
    } catch {
      setStatus('error')
      setDetail('Network error')
    }
    setTimeout(() => { setStatus('idle'); setDetail('') }, 4000)
  }

  return (
    <button
      onClick={handlePurge}
      disabled={status === 'loading'}
      title="Purge ImageKit CDN cache for this tab"
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
        status === 'done'  ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400' :
        status === 'error' ? 'border-steve text-steve' :
        'border-cream-border dark:border-warm-700 text-warm-500 hover:border-steve hover:text-steve dark:hover:border-warm-200'
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={status === 'loading' ? 'animate-spin' : ''}>
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      {status === 'loading' ? 'Purging…' : status === 'done' ? 'Purged' : status === 'error' ? 'Failed' : 'Purge Cache'}
      {detail && <span className="ml-1 opacity-70">&mdash; {detail}</span>}
    </button>
  )
}
