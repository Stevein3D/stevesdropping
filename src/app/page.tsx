import { prisma } from '@/lib/prisma'
import { TodayInHistory, type HistoryEvent } from '@/components/ui/TodayInHistory'
import { ComingUp } from '@/components/ui/ComingUp'
import { SteveOnADate } from '@/components/ui/SteveOnADate'
import { MarqueeCarousel } from '@/components/ui/MarqueeCarousel'
import { StatsSection } from '@/components/ui/StatsSection'
import { BrowseTile } from '@/components/ui/BrowseTile'
import { FadeInGrid } from '@/components/ui/FadeInGrid'

// 24h ISR window with a cron-triggered revalidate at midnight ET to refresh
// "today" content right at the day boundary. See vercel.json + /api/revalidate.
export const revalidate = 86400

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type RawRow = { id: bigint; name: string; imageUrl: string | null; year: number; month: number; day: number; updatedAt: Date }
type CarouselRow = { id: bigint; name: string; imageUrl: string; updatedAt: Date }

function toEvent(
  row: RawRow,
  type: HistoryEvent['type'],
  hrefBase: string,
  currentYear: number,
): HistoryEvent {
  const id = Number(row.id)
  return {
    type,
    year: Number(row.year),
    yearsAgo: currentYear - Number(row.year),
    name: row.name,
    imageUrl: row.imageUrl,
    imageVersion: row.updatedAt ? Math.floor(new Date(row.updatedAt).getTime() / 1000) : null,
    href: `${hrefBase}/${id}`,
    day: Number(row.day),
    displayDate: `${MONTH_SHORT[Number(row.month) - 1]} ${Number(row.day)}`,
  }
}

export default async function HomePage() {
  const TZ = 'America/New_York'
  const today = new Date()
  const todayMonth  = parseInt(today.toLocaleDateString('en-US', { month:  'numeric', timeZone: TZ }), 10)
  const todayDay    = parseInt(today.toLocaleDateString('en-US', { day:    'numeric', timeZone: TZ }), 10)
  const currentYear = parseInt(today.toLocaleDateString('en-US', { year:   'numeric', timeZone: TZ }), 10)

  const dateLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: TZ })

  // 7-day look-ahead window for "Coming Up"
  const windowEnd = new Date(today)
  windowEnd.setDate(windowEnd.getDate() + 7)
  const weMonth = parseInt(windowEnd.toLocaleDateString('en-US', { month: 'numeric', timeZone: TZ }), 10)
  const weDay   = parseInt(windowEnd.toLocaleDateString('en-US', { day:   'numeric', timeZone: TZ }), 10)
  const crossesMonth = weMonth !== todayMonth

  // "May 1–7" or "Apr 30 – May 6"
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomMonth = parseInt(tomorrow.toLocaleDateString('en-US', { month: 'numeric', timeZone: TZ }), 10)
  const tomDay   = parseInt(tomorrow.toLocaleDateString('en-US', { day:   'numeric', timeZone: TZ }), 10)
  const weekLabel = tomMonth === weMonth
    ? `${MONTH_SHORT[tomMonth - 1]} ${tomDay}–${weDay}`
    : `${MONTH_SHORT[tomMonth - 1]} ${tomDay} – ${MONTH_SHORT[weMonth - 1]} ${weDay}`

  let peopleCount = 0
  let characterCount = 0
  let titleCount = 0
  let castingCount = 0
  let carouselPeople: CarouselRow[] = []
  let carouselCharacters: CarouselRow[] = []
  let carouselTitles: CarouselRow[] = []
  let bornToday: RawRow[] = []
  let diedToday: RawRow[] = []
  let releasedToday: RawRow[] = []
  let bornComing: RawRow[] = []
  let diedComing: RawRow[] = []
  let releasedComing: RawRow[] = []

  try {
    ;[
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
    prisma.$queryRaw<{ id: bigint; name: string; imageUrl: string; updatedAt: Date }[]>`
      WITH featured AS (
        SELECT id, name, "imageUrl", "updatedAt", 0 AS priority FROM persons
        WHERE "imageUrl" IS NOT NULL AND featured = true
      ), filler AS (
        SELECT id, name, "imageUrl", "updatedAt", 1 AS priority FROM persons
        WHERE "imageUrl" IS NOT NULL AND featured = false
        ORDER BY random()
        LIMIT GREATEST(0, 8 - (SELECT COUNT(*) FROM featured))
      )
      SELECT id, name, "imageUrl", "updatedAt" FROM featured
      UNION ALL
      SELECT id, name, "imageUrl", "updatedAt" FROM filler`,
    prisma.$queryRaw<{ id: bigint; name: string; imageUrl: string; updatedAt: Date }[]>`
      WITH featured AS (
        SELECT id, name, "imageUrl", "updatedAt", 0 AS priority FROM characters
        WHERE "imageUrl" IS NOT NULL AND featured = true
      ), filler AS (
        SELECT id, name, "imageUrl", "updatedAt", 1 AS priority FROM characters
        WHERE "imageUrl" IS NOT NULL AND featured = false
        ORDER BY random()
        LIMIT GREATEST(0, 8 - (SELECT COUNT(*) FROM featured))
      )
      SELECT id, name, "imageUrl", "updatedAt" FROM featured
      UNION ALL
      SELECT id, name, "imageUrl", "updatedAt" FROM filler`,
    prisma.$queryRaw<{ id: bigint; name: string; imageUrl: string; updatedAt: Date }[]>`
      WITH featured AS (
        SELECT id, name, "imageUrl", "updatedAt", 0 AS priority FROM titles
        WHERE "imageUrl" IS NOT NULL AND featured = true
      ), filler AS (
        SELECT id, name, "imageUrl", "updatedAt", 1 AS priority FROM titles
        WHERE "imageUrl" IS NOT NULL AND featured = false
        ORDER BY random()
        LIMIT GREATEST(0, 8 - (SELECT COUNT(*) FROM featured))
      )
      SELECT id, name, "imageUrl", "updatedAt" FROM featured
      UNION ALL
      SELECT id, name, "imageUrl", "updatedAt" FROM filler`,

    // Today's events
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl", "updatedAt",
             EXTRACT(YEAR  FROM "birthDate")::int AS year,
             EXTRACT(MONTH FROM "birthDate")::int AS month,
             EXTRACT(DAY   FROM "birthDate")::int AS day
      FROM persons
      WHERE "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "birthDate") = ${todayDay}`,
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl", "updatedAt",
             EXTRACT(YEAR  FROM "deathDate")::int AS year,
             EXTRACT(MONTH FROM "deathDate")::int AS month,
             EXTRACT(DAY   FROM "deathDate")::int AS day
      FROM persons
      WHERE "deathDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "deathDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "deathDate") = ${todayDay}`,
    prisma.$queryRaw<RawRow[]>`
      SELECT id, name, "imageUrl", "updatedAt",
             EXTRACT(YEAR  FROM "releaseDate")::int AS year,
             EXTRACT(MONTH FROM "releaseDate")::int AS month,
             EXTRACT(DAY   FROM "releaseDate")::int AS day
      FROM titles
      WHERE "releaseDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "releaseDate") = ${todayMonth}
        AND EXTRACT(DAY   FROM "releaseDate") = ${todayDay}`,

    // Coming up — next 7 days, handles month rollover
    crossesMonth
      ? prisma.$queryRaw<RawRow[]>`
          (SELECT id, name, "imageUrl", "updatedAt",
                  EXTRACT(YEAR  FROM "birthDate")::int AS year,
                  EXTRACT(MONTH FROM "birthDate")::int AS month,
                  EXTRACT(DAY   FROM "birthDate")::int AS day
           FROM persons
           WHERE "birthDate" IS NOT NULL
             AND EXTRACT(MONTH FROM "birthDate") = ${todayMonth}
             AND EXTRACT(DAY   FROM "birthDate") > ${todayDay})
          UNION ALL
          (SELECT id, name, "imageUrl", "updatedAt",
                  EXTRACT(YEAR  FROM "birthDate")::int AS year,
                  EXTRACT(MONTH FROM "birthDate")::int AS month,
                  EXTRACT(DAY   FROM "birthDate")::int AS day
           FROM persons
           WHERE "birthDate" IS NOT NULL
             AND EXTRACT(MONTH FROM "birthDate") = ${weMonth}
             AND EXTRACT(DAY   FROM "birthDate") <= ${weDay})`
      : prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "birthDate")::int AS year,
                 EXTRACT(MONTH FROM "birthDate")::int AS month,
                 EXTRACT(DAY   FROM "birthDate")::int AS day
          FROM persons
          WHERE "birthDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "birthDate") = ${todayMonth}
            AND EXTRACT(DAY   FROM "birthDate") > ${todayDay}
            AND EXTRACT(DAY   FROM "birthDate") <= ${weDay}`,

    crossesMonth
      ? prisma.$queryRaw<RawRow[]>`
          (SELECT id, name, "imageUrl", "updatedAt",
                  EXTRACT(YEAR  FROM "deathDate")::int AS year,
                  EXTRACT(MONTH FROM "deathDate")::int AS month,
                  EXTRACT(DAY   FROM "deathDate")::int AS day
           FROM persons
           WHERE "deathDate" IS NOT NULL
             AND EXTRACT(MONTH FROM "deathDate") = ${todayMonth}
             AND EXTRACT(DAY   FROM "deathDate") > ${todayDay})
          UNION ALL
          (SELECT id, name, "imageUrl", "updatedAt",
                  EXTRACT(YEAR  FROM "deathDate")::int AS year,
                  EXTRACT(MONTH FROM "deathDate")::int AS month,
                  EXTRACT(DAY   FROM "deathDate")::int AS day
           FROM persons
           WHERE "deathDate" IS NOT NULL
             AND EXTRACT(MONTH FROM "deathDate") = ${weMonth}
             AND EXTRACT(DAY   FROM "deathDate") <= ${weDay})`
      : prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "deathDate")::int AS year,
                 EXTRACT(MONTH FROM "deathDate")::int AS month,
                 EXTRACT(DAY   FROM "deathDate")::int AS day
          FROM persons
          WHERE "deathDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "deathDate") = ${todayMonth}
            AND EXTRACT(DAY   FROM "deathDate") > ${todayDay}
            AND EXTRACT(DAY   FROM "deathDate") <= ${weDay}`,

    crossesMonth
      ? prisma.$queryRaw<RawRow[]>`
          (SELECT id, name, "imageUrl", "updatedAt",
                  EXTRACT(YEAR  FROM "releaseDate")::int AS year,
                  EXTRACT(MONTH FROM "releaseDate")::int AS month,
                  EXTRACT(DAY   FROM "releaseDate")::int AS day
           FROM titles
           WHERE "releaseDate" IS NOT NULL
             AND EXTRACT(MONTH FROM "releaseDate") = ${todayMonth}
             AND EXTRACT(DAY   FROM "releaseDate") > ${todayDay})
          UNION ALL
          (SELECT id, name, "imageUrl", "updatedAt",
                  EXTRACT(YEAR  FROM "releaseDate")::int AS year,
                  EXTRACT(MONTH FROM "releaseDate")::int AS month,
                  EXTRACT(DAY   FROM "releaseDate")::int AS day
           FROM titles
           WHERE "releaseDate" IS NOT NULL
             AND EXTRACT(MONTH FROM "releaseDate") = ${weMonth}
             AND EXTRACT(DAY   FROM "releaseDate") <= ${weDay})`
      : prisma.$queryRaw<RawRow[]>`
          SELECT id, name, "imageUrl", "updatedAt",
                 EXTRACT(YEAR  FROM "releaseDate")::int AS year,
                 EXTRACT(MONTH FROM "releaseDate")::int AS month,
                 EXTRACT(DAY   FROM "releaseDate")::int AS day
          FROM titles
          WHERE "releaseDate" IS NOT NULL
            AND EXTRACT(MONTH FROM "releaseDate") = ${todayMonth}
            AND EXTRACT(DAY   FROM "releaseDate") > ${todayDay}
            AND EXTRACT(DAY   FROM "releaseDate") <= ${weDay}`,
    ])
  } catch (err) {
    // DB unreachable (e.g., Neon auto-suspend at build/render time). Render
    // with empty state; ISR or the next cron-triggered revalidate will repopulate.
    console.error('[home] DB unreachable; rendering empty state:', err)
  }

  const todayEvents: HistoryEvent[] = [
    ...bornToday.map((r)     => toEvent(r, 'born',     '/people', currentYear)),
    ...diedToday.map((r)     => toEvent(r, 'died',     '/people', currentYear)),
    ...releasedToday.map((r) => toEvent(r, 'released', '/titles', currentYear)),
  ]

  // Sort by month*100+day so cross-month events (e.g. Apr 30 → May 1-6) order correctly
  const comingUpEvents: HistoryEvent[] = [
    ...bornComing.map((r)     => ({ r, type: 'born'     as const, base: '/people' })),
    ...diedComing.map((r)     => ({ r, type: 'died'     as const, base: '/people' })),
    ...releasedComing.map((r) => ({ r, type: 'released' as const, base: '/titles' })),
  ]
    .sort((a, b) => (Number(a.r.month) * 100 + Number(a.r.day)) - (Number(b.r.month) * 100 + Number(b.r.day)))
    .map(({ r, type, base }) => toEvent(r, type, base, currentYear))

  const carouselPeopleItems    = carouselPeople.map((r)     => ({ id: Number(r.id), name: r.name, imageUrl: r.imageUrl, href: `/people/${Number(r.id)}`,     imageVersion: Math.floor(new Date(r.updatedAt).getTime() / 1000) }))
  const carouselCharacterItems = carouselCharacters.map((r) => ({ id: Number(r.id), name: r.name, imageUrl: r.imageUrl, href: `/characters/${Number(r.id)}`, imageVersion: Math.floor(new Date(r.updatedAt).getTime() / 1000) }))
  const carouselTitleItems     = carouselTitles.map((r)     => ({ id: Number(r.id), name: r.name, imageUrl: r.imageUrl, href: `/titles/${Number(r.id)}`,     imageVersion: Math.floor(new Date(r.updatedAt).getTime() / 1000) }))

  return (
    <div>
      {/* Hero */}
      <section className="py-8 border-b border-cream-border dark:border-warm-700 mb-8">
        <div className="flex gap-8 items-center">
          {/* Left — text + stats */}
          <div className="flex-shrink-0 w-[100%] md:w-[40%] min-w-0">
            <p className="text-xs text-steve tracking-widest uppercase mb-2">The Steve Database</p>
            <h1 className="font-serif text-5xl font-black leading-tight tracking-tight text-warm-900 dark:text-warm-200">
              All Steves,<br />
              <em className="text-steve">all the time.</em>
            </h1>
            <p className="text-sm text-warm-600 dark:text-warm-500 mt-3 leading-relaxed">
              A catalog of every Steve across film, television, and beyond —
              real people and the characters they play.
            </p>
            <StatsSection
              people={peopleCount}
              characters={characterCount}
              titles={titleCount}
              castings={castingCount}
            />
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
      <ComingUp events={comingUpEvents} weekLabel={weekLabel} />

      {/* Take Steve on a Date */}
      <SteveOnADate />

      {/* Browse cards */}
      <FadeInGrid className="grid md:grid-cols-3 gap-4">
        <BrowseTile href="/people"     heading="Browse People"     body="Notable figures named Steve, and actors who play them" images={carouselPeopleItems.slice(0, 6)}     index={0} />
        <BrowseTile href="/characters" heading="Browse Characters" body="Fictional characters with the Steve name"               images={carouselCharacterItems.slice(0, 6)} index={1} />
        <BrowseTile href="/titles"     heading="Browse Titles"     body="Films, TV shows, and more featuring Steves"             images={carouselTitleItems.slice(0, 6)}     index={2} />
      </FadeInGrid>
    </div>
  )
}
