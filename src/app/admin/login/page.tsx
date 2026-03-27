'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-cream-card border border-cream-border dark:border-warm-700 rounded-lg p-8 w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs text-steve tracking-widest uppercase mb-1">Stevesdropping</p>
          <h1 className="font-serif text-2xl font-black text-warm-900 dark:text-warm-200">Admin</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoFocus
            className="w-full bg-cream dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 placeholder-warm-500 focus:outline-none focus:border-steve"
          />
          {error && <p className="text-xs text-steve">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-steve hover:bg-steve-hover text-cream text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
