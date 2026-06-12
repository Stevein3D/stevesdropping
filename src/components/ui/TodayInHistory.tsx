'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const AUTO_ADVANCE_MS = 6000

export type HistoryEvent = {
  type: 'born' | 'died' | 'released'
  year: number
  yearsAgo: number
  name: string
  imageUrl: string | null
  imageVersion: number | null
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
  died:     'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500',
  released: 'bg-steve/10 text-steve',
}

function EventCard({ event }: { event: HistoryEvent }) {
  const dateText = `${event.displayDate.toUpperCase()} · ${event.year}`

  return (
    <Link
      href={event.href}
      className="group bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-3 hover:border-steve dark:hover:border-warm-200 transition-colors flex items-start gap-3 h-full"
    >
      {/* Thumbnail */}
      <div className="w-[88px] h-[132px] rounded overflow-hidden flex-shrink-0 bg-warm-100 dark:bg-warm-700">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${event.imageUrl!.split('?')[0]}?tr=w-200,q-80${event.imageVersion ? `&ik-t=${event.imageVersion}` : ''}`}
            alt={event.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        )}
      </div>

      {/* Info: Name + Badge + Date on the left, years-ago hero stat on the right */}
      <div className="min-w-0 flex-1 flex gap-3 h-[132px]">
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="font-serif font-bold text-[15px] sm:text-[16px] text-warm-900 dark:text-warm-200 leading-tight line-clamp-2 group-hover:text-steve transition-colors">
            {event.name}
          </p>
          <span className={`self-start inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${TYPE_STYLE[event.type]}`}>
            {TYPE_LABEL[event.type]}
          </span>
          <p
            className="mt-auto pt-2 text-[10px] uppercase font-semibold text-warm-500 dark:text-warm-500 tabular-nums"
            style={{ letterSpacing: '0.12em' }}
          >
            {dateText}
          </p>
        </div>

        {event.yearsAgo > 0 && (
          <div className="flex flex-col items-end shrink-0 text-right">
            <span className="font-display text-steve text-[34px] leading-none tabular-nums">
              {event.yearsAgo}
            </span>
            <span
              className="mt-1 text-[9px] uppercase font-semibold text-warm-500 dark:text-warm-500"
              style={{ letterSpacing: '0.16em' }}
            >
              {event.yearsAgo === 1 ? 'yr ago' : 'yrs ago'}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export function TodayInHistory({ events, dateLabel }: { events: HistoryEvent[]; dateLabel: string }) {
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)
  const perPage = 3
  const totalPages = Math.max(1, Math.ceil(events.length / perPage))
  const visible = events.slice(page * perPage, page * perPage + perPage)

  // Auto-advance every AUTO_ADVANCE_MS; pause on hover; reset timer on manual change.
  useEffect(() => {
    if (totalPages <= 1 || paused) return
    const id = setInterval(() => {
      setPage((p) => (p + 1) % totalPages)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [totalPages, paused, page])

  return (
    <section
      className="pb-8 border-b border-cream-border dark:border-warm-700 mb-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
          Today in Steve History
        </h2>
        <span className="text-[22px] font-serif font-bold text-steve">{dateLabel}</span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-warm-600 dark:text-warm-500 italic">Nothing on record for today.</p>
      ) : (
        <>
          <div
            key={page}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-slider-fade"
          >
            {visible.map((event) => (
              <EventCard key={`${event.href}-${event.type}`} event={event} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-warm-600 dark:text-warm-500 hover:text-steve transition-colors disabled:opacity-50"
                aria-label="Previous page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3L5 8l5 5" />
                </svg>
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === page
                        ? 'bg-steve border border-steve'
                        : 'bg-transparent border border-warm-400 dark:border-warm-600'
                    }`}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="text-warm-600 dark:text-warm-500 hover:text-steve transition-colors disabled:opacity-50"
                aria-label="Next page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
