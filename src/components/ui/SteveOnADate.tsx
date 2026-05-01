'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { HistoryEvent } from './TodayInHistory'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

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
  return (
    <Link
      href={event.href}
      className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-3 hover:border-steve dark:hover:border-warm-200 transition-colors flex items-start gap-3 h-full"
    >
      <div className="w-14 h-[72px] rounded overflow-hidden flex-shrink-0 bg-warm-100 dark:bg-warm-700">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${event.imageUrl.split('?')[0]}?tr=w-112,q-80${event.imageVersion ? `&ik-t=${event.imageVersion}` : ''}`}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between h-[72px]">
        <div>
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1 ${TYPE_STYLE[event.type]}`}>
            {TYPE_LABEL[event.type]}
          </span>
          <p className="text-sm font-medium text-warm-900 dark:text-warm-200 leading-tight line-clamp-2">{event.name}</p>
        </div>
        <p className="text-[11px] text-warm-600 dark:text-warm-500">
          {event.year}
          {event.yearsAgo > 0 && ` · ${event.yearsAgo} yrs ago`}
        </p>
      </div>
    </Link>
  )
}

const SESSION_KEY = 'steve-on-a-date'

export function SteveOnADate() {
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [events, setEvents] = useState<HistoryEvent[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [submittedLabel, setSubmittedLabel] = useState('')

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        const { month, day, year, events, submittedLabel } = JSON.parse(saved)
        setMonth(month)
        setDay(day)
        setYear(year)
        setEvents(events)
        setSubmittedLabel(submittedLabel)
      }
    } catch {}
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!month || !day) return

    setLoading(true)
    const params = new URLSearchParams({ month, day })
    if (year) params.set('year', year)

    const label = year
      ? `${MONTH_SHORT[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
      : `${MONTH_SHORT[parseInt(month) - 1]} ${parseInt(day)}`
    setSubmittedLabel(label)

    const res = await fetch(`/api/steve-date?${params}`)
    const data: HistoryEvent[] = await res.json()
    setEvents(data)
    setLoading(false)

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ month, day, year, events: data, submittedLabel: label }))
    } catch {}
  }

  return (
    <section className="pb-8 border-b border-cream-border dark:border-warm-700 mb-8">
      <div className="mb-4">
        <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">
          Date a Steve
        </h2>
        <p className="text-sm text-warm-600 dark:text-warm-500 mt-0.5">
          Pick any date to see who was born, died, or what was released.
        </p>
      </div>

      <p className="text-xs text-warm-600 dark:text-warm-500 mb-3">
        * Year is optional
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mb-5">
        {/* Month */}
        <div className="relative">
          <select
            value={month}
            onChange={e => {
              const m = e.target.value
              setMonth(m)
              if (day && m && parseInt(day) > DAYS_IN_MONTH[parseInt(m) - 1]) setDay('')
            }}
            required
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-3 pr-8 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
          >
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-600 dark:text-warm-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Day */}
        <div className="relative">
          <select
            value={day}
            onChange={e => setDay(e.target.value)}
            required
            disabled={!month}
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-3 pr-8 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve disabled:opacity-40"
          >
            <option value="">Day</option>
            {month && Array.from({ length: DAYS_IN_MONTH[parseInt(month) - 1] }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-600 dark:text-warm-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Year */}
        <input
          type="number"
          min={1888}
          max={new Date().getFullYear()}
          value={year}
          onChange={e => setYear(e.target.value)}
          placeholder="Year *"
          className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-3 py-2 text-sm text-warm-900 dark:text-warm-200 w-20 focus:outline-none focus:border-steve"
        />

        <button
          type="submit"
          disabled={loading || !month || !day}
          className="bg-steve hover:bg-steve-hover text-cream text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Looking…' : 'Go'}
        </button>
      </form>

      {events !== null && (
        events.length === 0 ? (
          <p className="text-sm text-warm-600 dark:text-warm-500 italic">Nothing on record for {submittedLabel}.</p>
        ) : (
          <>
            <p className="text-xs text-warm-600 dark:text-warm-500 mb-3">
              {events.length} result{events.length !== 1 ? 's' : ''} for {submittedLabel}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.map(event => (
                <EventCard key={`${event.href}-${event.type}-${event.year}`} event={event} />
              ))}
            </div>
          </>
        )
      )}
    </section>
  )
}
