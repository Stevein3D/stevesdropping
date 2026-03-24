'use client'
import { useEffect, useState } from 'react'

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="text-xs border border-warm-500 text-warm-600 dark:text-warm-500 px-3 py-1 rounded-full hover:border-steve hover:text-steve transition-colors"
    >
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
