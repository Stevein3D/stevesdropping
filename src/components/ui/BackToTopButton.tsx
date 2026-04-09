'use client'

import { useEffect, useState } from 'react'

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`
        fixed bottom-7 right-7 z-[100]
        w-11 h-11 rounded-full
        flex items-center justify-center
        border-2 border-warm-500 dark:border-warm-600
        bg-cream dark:bg-warm-800
        text-warm-600 dark:text-warm-500
        shadow-md
        hover:border-steve dark:hover:border-warm-200 hover:text-steve
        transition-all duration-200
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
    >
      <svg
        width="20" height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-bounce"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}
