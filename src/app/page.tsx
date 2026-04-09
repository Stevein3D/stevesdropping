import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TodayInHistory, type HistoryEvent } from '@/components/ui/TodayInHistory'
import { ComingUp } from '@/components/ui/ComingUp'
import { MarqueeCarousel } from '@/components/ui/MarqueeCarousel'

export const dynamic = 'force-dynamic'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type RawRow = { id: bigint; name: string; imageUrl: string | null; year: number; day: number }

function toEvent(
  row: RawRow,
  type: HistoryEvent['type'],
  hrefBase: string,
  todayMonth: number,
  currentYear: number,
): HistoryEvent {
  const id = Number(row.id)
  return {
    type,
    year: Number(row.year),
    yearsAgo: currentYear - Number(row.year),
    name: row.name,
    imageUrl: row.imageUrl,
    href: `${hrefBase}/${id}`,
    day: Number(row.day),
    displayDate: `${MONTH_SHORT[todayMonth - 1]} ${Number(row.day)}`,
  }
}

export default async function HomePage() {
  const TZ = 'America/New_York'
  const today = new Date()
  const todayMonth  = parseInt(today.toLocaleDateString('en-US', { month:  'numeric', timeZone: TZ }), 10)
  const todayDay    = parseInt(today.toLocaleDateString('en-US', { day:    'numeric', timeZone: TZ }), 10)
  const currentYear = parseInt(today.toLocaleDateString('en-US', { year:   'numeric', timeZone: TZ }), 10)

  const dateLabel  = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: TZ })
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', timeZone: TZ })

  const [
    peopleCount, characterCount, titleCount, castingCount,
    carouselPeople, carouselCharacters, carouselTitles,
    bornToday, diedToday, releasedToday,
    bornComing, diedComing, releasedComing,
  ] = await Promise.all([
    prisma.person.count(),
    prisma.character.count(),
    prisma.title.count(),
    prisma.casting.count(),
    // Carousel — featured first, padded with random non-featured to min 8
    prisma.$queryRaw<{ id: bigint; name: string; imageUrl: string }[]>`
      WITH featured AS (
        SELECT id, name, "imageUrl", 0 AS priority FROM persons
        WHERE "imageUrl" IS NOT NULL AND featured = true
      ), filler AS (
        SELECT id, name, "imageUrl", 1 AS priority FROM persons
        WHERE "imageUrl" IS NOT NULL AND featured = false
        ORDER BY random()
        LIMIT GREATEST(0, 8 - (SELECT COUNT(*) FROM featured))
      )
      SELECT id, name, "imageUrl" FROM featured
      UNION ALL
      SELECT id, name, "imageUrl" FROM filler`,
    prisma.$queryRaw<{ id: bigint; name: string; imageUrl: string }[]>`
      WITH featured AS (
        SELECT id, name, "imageUrl", 0 AS priority FROM characters
        WHERE "imageUrl" IS NOT NULL AND featured = true
      ), filler AS (
        SELECT id, name, "imageUrl", 1 AS priority FROM characters
        WHERE "imageUrl" IS NOT NULL AND featured = false
        ORDER BY random()
        LIMIT GREATEST(0, 8 - (SELECT COUNT(*) FROM featured))
      )
      SELECT id, name, "imageUrl" FROM featured
      UNION ALL
      SELECT id, name, "imageUrl" FROM filler`,
    prisma.$queryRaw<{ id: bigint; name: string; imageUrl: string }[]>`
      WITH featured AS (
        SELECT id, name, "imageUrl", 0 AS priority FROM titles
        WHERE "imageUrl" IS NOT NULL AND featured = true
      ), filler AS (
        SELECT id, name, "imageUrl", 1 AS priority FROM titles
        WHERE "imageUrl" IS NOT NULL AND featured = false
        ORDER BY random()
        LIMIT GREATEST(0, 8 - (SELECT COUNT(*) FROM featured))
      )
      SELECT id, name, "imageUrl" FROM featured
      UNION ALL
      SELECT id, name, "imageUrl" FROM filler`,
    // Today's events
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl",
             EXTRACT(YEAR FROM "birthDate")::int AS year,
             EXTRACT(DAY  FROM "birthDate")::int AS day
      FROM persons
      WHERE "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "birthDate") = ${todayDay}`,
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl",
             EXTRACT(YEAR FROM "deathDate")::int AS year,
             EXTRACT(DAY  FROM "deathDate")::int AS day
      FROM persons
      WHERE "deathDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "deathDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "deathDate") = ${todayDay}`,
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl",
             EXTRACT(YEAR FROM "releaseDate")::int AS year,
             EXTRACT(DAY  FROM "releaseDate")::int AS day
      FROM titles
      WHERE "releaseDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "releaseDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "releaseDate") = ${todayDay}`,
    // Coming up (rest of month)
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl",
             EXTRACT(YEAR FROM "birthDate")::int AS year,
             EXTRACT(DAY  FROM "birthDate")::int AS day
      FROM persons
      WHERE "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "birthDate") > ${todayDay}`,
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl",
             EXTRACT(YEAR FROM "deathDate")::int AS year,
             EXTRACT(DAY  FROM "deathDate")::int AS day
      FROM persons
      WHERE "deathDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "deathDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "deathDate") > ${todayDay}`,
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl",
             EXTRACT(YEAR FROM "releaseDate")::int AS year,
             EXTRACT(DAY  FROM "releaseDate")::int AS day
      FROM titles
      WHERE "releaseDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "releaseDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "releaseDate") > ${todayDay}`,
  ])

  const todayEvents: HistoryEvent[] = [
    ...bornToday.map((r)     => toEvent(r, 'born',     '/people', todayMonth, currentYear)),
    ...diedToday.map((r)     => toEvent(r, 'died',     '/people', todayMonth, currentYear)),
    ...releasedToday.map((r) => toEvent(r, 'released', '/titles', todayMonth, currentYear)),
  ]

  const comingUpEvents: HistoryEvent[] = [
    ...bornComing.map((r)     => toEvent(r, 'born',     '/people', todayMonth, currentYear)),
    ...diedComing.map((r)     => toEvent(r, 'died',     '/people', todayMonth, currentYear)),
    ...releasedComing.map((r) => toEvent(r, 'released', '/titles', todayMonth, currentYear)),
  ].sort((a, b) => a.day - b.day)

  const stats = [
    { label: 'People',     value: peopleCount,    href: '/people' },
    { label: 'Characters', value: characterCount,  href: '/characters' },
    { label: 'Titles',     value: titleCount,      href: '/titles' },
    { label: 'Castings',   value: castingCount,    href: '/people' },
  ]

  const carouselPeopleItems     = carouselPeople.map((r)     => ({ id: Number(r.id), name: r.name, imageUrl: r.imageUrl, href: `/people/${Number(r.id)}` }))
  const carouselCharacterItems  = carouselCharacters.map((r) => ({ id: Number(r.id), name: r.name, imageUrl: r.imageUrl, href: `/characters/${Number(r.id)}` }))
  const carouselTitleItems      = carouselTitles.map((r)     => ({ id: Number(r.id), name: r.name, imageUrl: r.imageUrl, href: `/titles/${Number(r.id)}` }))

  return (
    <div>
      {/* Hero */}
      <section className="py-8 border-b border-cream-border dark:border-warm-700 mb-8">
        <div className="flex gap-8 items-center">
          {/* Left — text + stats */}
          <div className="flex-shrink-0 w-[40%] min-w-0">
            <p className="text-xs text-steve tracking-widest uppercase mb-2">The Steve Database</p>
            <h1 className="font-serif text-5xl font-black leading-tight tracking-tight text-warm-900 dark:text-warm-200">
              All Steves,<br />
              <em className="text-steve">all the time.</em>
            </h1>
            <p className="text-sm text-warm-600 dark:text-warm-500 mt-3 leading-relaxed">
              A catalog of every Steve across film, television, and beyond —
              real people and the characters they play.
            </p>
            <div className="flex gap-6 mt-6 flex-wrap">
              {stats.map(({ label, value, href }) => (
                <Link key={label} href={href} className="group">
                  <div className="font-serif text-3xl font-bold text-steve leading-none group-hover:text-steve-hover transition-colors">{value}</div>
                  <div className="text-xs text-warm-500 tracking-widest uppercase mt-1">{label}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right — marquee carousel, hidden on mobile */}
          <div className="hidden md:block flex-1 min-w-0 overflow-hidden">
            <MarqueeCarousel
              people={carouselPeopleItems}
              characters={carouselCharacterItems}
              titles={carouselTitleItems}
            />
          </div>
        </div>
      </section>

      {/* Today in Steve History */}
      <TodayInHistory events={todayEvents} dateLabel={dateLabel} />

      {/* Coming Up */}
      <ComingUp events={comingUpEvents} monthLabel={monthLabel} />

      {/* Browse cards */}
      <section className="grid md:grid-cols-3 gap-4">
        {[
          { href: '/people',     heading: 'Browse People',     body: 'Actors and notable figures named Steve or Steven' },
          { href: '/characters', heading: 'Browse Characters', body: 'Fictional characters with the Steve name' },
          { href: '/titles',     heading: 'Browse Titles',     body: 'Films, TV shows, and more featuring Steves' },
        ].map(({ href, heading, body }) => (
          <Link
            key={href}
            href={href}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-6 hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 mb-1">{heading}</h2>
            <p className="text-sm text-warm-600 dark:text-warm-500">{body}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
