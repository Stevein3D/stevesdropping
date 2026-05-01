'use client'
import { useRouter } from 'next/navigation'

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="group relative inline-flex items-center gap-1.5 text-sm text-warm-600 dark:text-warm-500 hover:text-steve transition-colors duration-200 cursor-pointer rounded-md px-3 py-1 border border-cream-border dark:border-warm-700 overflow-hidden"
    >
      {/* Chevron — springs left on hover */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-x-1"
      >
        <path d="M10 3L5 8l5 5" />
      </svg>

      {/* Label */}
      <span>{label}</span>

      {/* Full-pill underline — clips to rounded edges via overflow-hidden on parent */}
      <span className="absolute bottom-0 left-0 w-full h-px bg-steve origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[220ms] ease-out" />
    </button>
  )
}
