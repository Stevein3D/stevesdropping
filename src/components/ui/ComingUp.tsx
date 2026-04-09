import Link from 'next/link'
import type { HistoryEvent } from './TodayInHistory'

const TYPE_LABEL: Record<HistoryEvent['type'], string> = {
  born:     'Born',
  died:     'Died',
  released: 'Released',
}

export function ComingUp({ events, monthLabel }: { events: HistoryEvent[]; monthLabel: string }) {
  if (events.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-lg font-bold text-warm-900 dark:text-warm-200">Coming Up</h2>
        <span className="text-sm font-medium text-warm-500">Later in {monthLabel}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {events.slice(0, 8).map((event) => (
          <Link
            key={`${event.href}-${event.type}`}
            href={event.href}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-2.5 hover:border-steve dark:hover:border-warm-200 transition-colors flex items-center gap-2"
          >
            <div className="w-8 h-10 rounded overflow-hidden flex-shrink-0 bg-warm-100 dark:bg-warm-700">
              {event.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${event.imageUrl}?tr=w-64,q-70`}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-warm-900 dark:text-warm-200 truncate leading-tight">{event.name}</p>
              <p className="text-[10px] text-warm-500 truncate">
                {TYPE_LABEL[event.type]} · {event.displayDate}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
