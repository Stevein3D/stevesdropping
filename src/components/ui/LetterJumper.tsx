'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const LETTERS = [
  '#',
  'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'H', 'I', 'J', 'K', 'L', 'M', 'N',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U',
  'V', 'W', 'X', 'Y', 'Z',
]

export function LetterJumper({
  letterPages,
  basePath,
}: {
  letterPages: Record<string, number>
  basePath: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function jump(letter: string) {
    const page = letterPages[letter]
    if (!page) return
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) params.delete('page')
    else params.set('page', String(page))
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
    setOpen(false)

    // The destination tile may not exist yet if the page just navigated —
    // poll briefly until it's in the DOM, then scroll with a header offset.
    const id = `letter-${letter}`
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        // 96px ≈ sticky header (~60px) + breathing room (~36px)
        const top = el.getBoundingClientRect().top + window.scrollY - 96
        window.scrollTo({ top, behavior: 'smooth' })
      } else if (attempts < 20) {
        attempts++
        setTimeout(tryScroll, 80)
      }
    }
    setTimeout(tryScroll, 50)
  }

  return (
    <div className="relative z-30" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 hover:border-steve dark:hover:border-warm-200 transition-colors inline-flex items-center gap-2"
        aria-label="Jump to letter"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>ABC…</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-warm-600 dark:text-warm-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Jump to letter"
          className="absolute top-full left-0 mt-2 z-20 w-max bg-cream dark:bg-warm-800 border border-cream-border dark:border-warm-700 rounded-lg p-3 shadow-lg"
        >
          <div className="grid grid-cols-7 gap-1.5">
            {LETTERS.map((letter) => {
              const hasPage = letterPages[letter] != null
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasPage}
                  onClick={() => jump(letter)}
                  className={`w-10 h-10 rounded-md font-display text-[16px] leading-none transition-colors ${
                    hasPage
                      ? 'text-warm-900 dark:text-warm-200 hover:bg-steve hover:text-cream cursor-pointer'
                      : 'text-warm-500/40 dark:text-warm-500/30 cursor-not-allowed'
                  }`}
                  aria-label={letter === '#' ? 'Jump to non-letter titles' : `Jump to ${letter}`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
