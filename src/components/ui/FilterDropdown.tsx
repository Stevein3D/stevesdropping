'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export type FilterOption = { value: string; label: string }

type Props = {
  paramName: string
  options: FilterOption[]
  className?: string
}

// Replaces the native <select> for filter dropdowns. The native widget's
// position-and-scroll behavior gets unreliable when there are many options
// near the viewport bottom, and the open menu can hang around during page
// re-renders. This component closes deterministically on selection, flips
// upward when there isn't enough room below, and scrolls internally.
export function FilterDropdown({ paramName, options, className }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentValue = searchParams.get(paramName) ?? ''

  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [focusIndex, setFocusIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const currentOption = options.find(o => o.value === currentValue) ?? options[0]

  // Viewport check: drop up if there's more space above than below.
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setDropUp(spaceBelow < 300 && rect.top > spaceBelow)
  }, [open])

  // Initialize keyboard focus to the currently-selected option on open.
  useEffect(() => {
    if (!open) return
    const idx = options.findIndex(o => o.value === currentValue)
    setFocusIndex(idx >= 0 ? idx : 0)
  }, [open, currentValue, options])

  // Outside click + keyboard handling.
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIndex(i => Math.min(i + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        if (focusIndex >= 0) {
          e.preventDefault()
          select(options[focusIndex].value)
        }
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusIndex, options])

  // Scroll the focused option into view as keyboard nav moves it.
  useEffect(() => {
    if (!open || focusIndex < 0 || !listRef.current) return
    const node = listRef.current.children[focusIndex] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [open, focusIndex])

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(paramName, value)
    } else {
      params.delete(paramName)
    }
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  const triggerClass =
    className ??
    'appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve'

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`${triggerClass} text-left relative`}
      >
        <span className="block truncate pr-4">{currentOption?.label ?? ''}</span>
        <svg
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-warm-600 dark:text-warm-500 transition-transform ${open ? 'rotate-180' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className={`absolute z-50 left-0 min-w-full max-h-72 overflow-y-auto bg-cream-card dark:bg-warm-700 border border-cream-border dark:border-warm-700 rounded-lg shadow-lg py-1 ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === currentValue
            const isFocused = i === focusIndex
            return (
              <button
                key={opt.value || '__all__'}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => select(opt.value)}
                onMouseEnter={() => setFocusIndex(i)}
                className={`block w-full text-left px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                  isFocused ? 'bg-cream-subtle/60 dark:bg-warm-50/10' : ''
                } ${isSelected ? 'text-steve font-semibold' : 'text-warm-900 dark:text-warm-200'}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
