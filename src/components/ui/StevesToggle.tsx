'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// Checkbox-styled toggle for the "steves" query param — filters the list down
// to entries that are Steve or Steve-adjacent by name.
export function StevesToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('steves') === '1'

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (active) {
      params.delete('steves')
    } else {
      params.set('steves', '1')
    }
    params.delete('page')
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`)
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={toggle}
      className="inline-flex items-center gap-2.5 rounded-lg border border-cream-border dark:border-warm-700 bg-cream-card dark:bg-warm-50/5 px-4 py-2 text-sm text-warm-900 dark:text-warm-200 hover:border-steve dark:hover:border-warm-200 transition-colors"
    >
      <span
        aria-hidden
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          active ? 'border-steve bg-steve text-cream' : 'border-warm-400 dark:border-warm-500 bg-transparent'
        }`}
      >
        {active && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span>Just the Steves, please</span>
    </button>
  )
}
