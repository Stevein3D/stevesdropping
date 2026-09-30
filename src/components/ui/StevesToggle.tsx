'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Props = {
  paramName: string
  label: string
  // Default-on toggles are checked while the param is absent and write
  // `param=0` when unchecked, so the default state keeps a clean URL.
  defaultOn?: boolean
}

// Checkbox-styled toggle bound to a single query param.
export function ParamToggle({ paramName, label, defaultOn = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const raw = searchParams.get(paramName)
  const active = defaultOn ? raw !== '0' : raw === '1'

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    const next = !active
    if (next === defaultOn) {
      params.delete(paramName)
    } else {
      params.set(paramName, next ? '1' : '0')
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
      <span>{label}</span>
    </button>
  )
}

// Filters the list down to entries that are Steve or Steve-adjacent by name.
export function StevesToggle() {
  return <ParamToggle paramName="steves" label="Just the Steves, please" />
}
