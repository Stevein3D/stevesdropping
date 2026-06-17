'use client'
import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function SuggestForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      setError('Please add a message.')
      setStatus('error')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, website }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong, please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setError('Something went wrong, please try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-sm text-steve text-center">
        Thanks — we&apos;ll add them Steventually!
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto text-left">
      <h2 className="font-serif text-2xl font-black text-warm-900 dark:text-warm-200 text-center">
        Are we missing any Steves?
      </h2>
      <p className="text-sm text-warm-600 dark:text-warm-500 mt-1 mb-4 text-center">
        Let us know and we&apos;ll add them Steventually!
      </p>

      {/* Honeypot — hidden from humans */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] w-px h-px overflow-hidden"
        aria-hidden="true"
      />

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email (optional)"
        className="w-full rounded-md border border-cream-subtle dark:border-warm-700 bg-cream-card dark:bg-warm-50/5 px-3 py-2 text-sm text-warm-900 dark:text-warm-200 mb-2 focus:outline-none focus:border-steve"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Which Steve are we missing?"
        required
        rows={3}
        maxLength={2000}
        className="w-full rounded-md border border-cream-subtle dark:border-warm-700 bg-cream-card dark:bg-warm-50/5 px-3 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
      />

      {status === 'error' && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-3 w-full rounded-md bg-steve text-white text-sm font-medium py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send suggestion'}
      </button>
    </form>
  )
}
