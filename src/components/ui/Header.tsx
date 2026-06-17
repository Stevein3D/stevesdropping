'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/people',     label: 'People' },
  { href: '/characters', label: 'Characters' },
  { href: '/titles',     label: 'Titles' },
]

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

export function Header() {
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  // Jump to the footer suggestion form and focus the email field. If the form
  // was already submitted (the email input no longer exists), fall back to
  // scrolling to the footer container.
  const goToSuggest = () => {
    setMenuOpen(false)
    const input = document.getElementById('suggest-email') as HTMLInputElement | null
    const target = input ?? document.getElementById('suggest')
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (input) {
      // Delay focus so it doesn't interrupt the smooth scroll.
      setTimeout(() => input.focus({ preventScroll: true }), 600)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b-2 border-steve py-4 bg-cream dark:bg-warm-800">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl font-black text-steve tracking-tight">
          Stevesdropping
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6 text-sm text-warm-600 dark:text-warm-500">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-steve transition-colors">
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={goToSuggest}
            aria-label="Suggest a missing Steve"
            className="border border-warm-500 text-warm-600 dark:text-warm-500 p-1.5 rounded-full hover:border-steve dark:hover:border-warm-200 hover:text-steve transition-colors"
          >
            <MailIcon />
          </button>
          <button
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="border border-warm-500 text-warm-600 dark:text-warm-500 p-1.5 rounded-full hover:border-steve dark:hover:border-warm-200 hover:text-steve transition-colors"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </nav>

        {/* Mobile: mail + dark toggle + hamburger */}
        <div className="flex sm:hidden items-center gap-3 text-warm-600 dark:text-warm-500">
          <button
            type="button"
            onClick={goToSuggest}
            aria-label="Suggest a missing Steve"
            className="border border-warm-500 text-warm-600 dark:text-warm-500 p-1.5 rounded-full hover:border-steve dark:hover:border-warm-200 hover:text-steve transition-colors"
          >
            <MailIcon />
          </button>
          <button
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="border border-warm-500 p-1.5 rounded-full hover:border-steve dark:hover:border-warm-200 hover:text-steve transition-colors"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="hover:text-steve transition-colors"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — absolute so it overlays content below */}
      <div className={`sm:hidden absolute left-0 right-0 bg-cream dark:bg-warm-800 border-b-2 border-steve transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
        <nav className="max-w-6xl mx-auto px-6 pt-4 pb-4 flex flex-col gap-4 text-sm text-warm-600 dark:text-warm-500">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-steve transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
