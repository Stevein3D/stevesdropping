'use client'
import { useState } from 'react'
import Link from 'next/link'

export type HistoryEvent = {
  type: 'born' | 'died' | 'released'
  year: number
  yearsAgo: number
  name: string
  imageUrl: string | null
  href: string
  day: number
  displayDate: string // e.g. "Apr 15"
}

const TYPE_LABEL: Record<HistoryEvent['type'], string> = {
  born:     'Born',
  died:     'Died',
  released: 'Released',
}

const TYPE_STYLE: Record<HistoryEvent['type'], string> = {
  born:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  died:     'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400',
  released: 'bg-steve/10 text-steve',
}

function EventCard({ event }: { event: HistoryEvent }) {
  return (
    <Link
      href={event.href}
      className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-3 hover:border-steve transition-colors flex items-start gap-3 h-full"
    >
      {/* Thumbnail */}
      <div className="w-14 h-[72px] rounded overflow-hidden flex-shrink-0 bg-warm-100 dark:bg-warm-700">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${event.imageUrl}?tr=w-112,q-80`}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 flex flex-col justify-between h-[72px]">
        <div>
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1 ${TYPE_STYLE[event.type]}`}>
            {TYPE_LABEL[event.type]}
          </span>
          <p className="text-sm font-medium text-warm-900 dark:text-warm-200 leading-tight line-clamp-2">{event.name}</p>
        </div>
        <p className="text-[11px] text-warm-500">
          {event.year}
          {event.yearsAgo > 0 && ` · ${event.yearsAgo} yrs ago`}
        </p>
      </div>
    </Link>
  )
}

export function TodayInHistory({ events, dateLabel }: { events: HistoryEvent[]; dateLabel: string }) {
  const [page, setPage] = useState(0)
  const perPage = 3
  const totalPages = Math.max(1, Math.ceil(events.length / perPage))
  const visible = events.slice(page * perPage, page * perPage + perPage)

  return (
    <section className="pb-8 border-b border-cream-border dark:border-warm-700 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">
          Today in Steve History
        </h2>
        <span className="text-xs text-warm-500">{dateLabel}</span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-warm-500 italic">Nothing on record for today.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map((event) => (
              <EventCard key={`${event.href}-${event.type}`} event={event} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs text-warm-500 hover:text-steve transition-colors disabled:opacity-30"
              >
                ← Prev
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === page ? 'bg-steve' : 'bg-warm-300 dark:bg-warm-600'
                    }`}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="text-xs text-warm-500 hover:text-steve transition-colors disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
