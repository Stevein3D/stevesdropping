'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Props = {
  page: number
  totalPages: number
  basePath: string
}

export function Pagination({ page, totalPages, basePath }: Props) {
  const searchParams = useSearchParams()

  function href(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(p))
    }
    const qs = params.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-2">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve transition-colors"
        >
          ← Previous
        </Link>
      ) : (
        <span className="text-sm text-warm-300 dark:text-warm-700">← Previous</span>
      )}

      <span className="text-xs text-warm-500">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve transition-colors"
        >
          Next →
        </Link>
      ) : (
        <span className="text-sm text-warm-300 dark:text-warm-700">Next →</span>
      )}
    </div>
  )
}
