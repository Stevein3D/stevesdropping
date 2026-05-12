import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { FadeInGrid } from '@/components/ui/FadeInGrid'

async function getCastingSummaries(titleIds: number[]): Promise<Map<number, string[]>> {
  if (titleIds.length === 0) return new Map()

  const joined = Prisma.join(titleIds)
  const joined2 = Prisma.join(titleIds)

  const rows = await prisma.$queryRaw<{
    title_id: number
    person_name: string
    character_name: string
  }[]>`
    SELECT c."titleId" AS title_id, p.name AS person_name, ch.name AS character_name
    FROM castings c
    JOIN persons p      ON p.id = c."personId"
    JOIN characters ch  ON ch.id = c."characterId"
    WHERE c."titleId" IN (${joined}) AND c."episodeId" IS NULL

    UNION

    SELECT e."titleId" AS title_id, p.name AS person_name, ch.name AS character_name
    FROM castings c
    JOIN episodes e     ON e.id = c."episodeId"
    JOIN persons p      ON p.id = c."personId"
    JOIN characters ch  ON ch.id = c."characterId"
    WHERE e."titleId" IN (${joined2})
  `

  const map = new Map<number, Map<string, string>>()
  for (const row of rows) {
    const id = Number(row.title_id)
    if (!map.has(id)) map.set(id, new Map())
    const pairs = map.get(id)!
    const key = `${row.person_name}|${row.character_name}`
    if (!pairs.has(key)) pairs.set(key, `${row.person_name} as ${row.character_name}`)
  }

  return new Map(
    Array.from(map.entries()).map(([id, pairs]) => [id, Array.from(pairs.values())])
  )
}

export const revalidate = 60

export const metadata = {
  title: 'Titles',
  description: 'Browse every film, TV series, and short cataloged on Stevesdropping — every project that has ever featured a Steve.',
  openGraph: {
    title: 'Titles — Stevesdropping',
    description: 'Browse every film, TV series, and short cataloged on Stevesdropping.',
    url: '/titles',
  },
  twitter: {
    title: 'Titles — Stevesdropping',
    description: 'Browse every film, TV series, and short cataloged on Stevesdropping.',
  },
  alternates: { canonical: '/titles' },
}

const PAGE_SIZE = 45

const TYPE_LABELS: Record<string, string> = {
  film:          'Film',
  tv_series:     'TV Series',
  tv_movie:      'TV Movie',
  animated:      'Animated',
  short:         'Short',
  documentary:   'Documentary',
  other:         'Other',
}

type SortOption = 'name_desc' | 'newest' | 'oldest' | 'appearances' | 'rating' | 'recent'

const SORT_OPTIONS: { value: SortOption | ''; label: string }[] = [
  { value: '',            label: 'A–Z' },
  { value: 'name_desc',  label: 'Z–A' },
  { value: 'newest',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'appearances', label: 'Most appearances' },
  { value: 'rating',     label: 'Highest rated' },
  { value: 'recent',     label: 'Recently added' },
]

// A–Z and Z–A use raw SQL so LOWER() can be applied to titleSort/name.
// LEFT JOINs episodes so a search can match on episodeTitle as well.
async function getNameSortedIds(
  search: string,
  type: string | undefined,
  dir: 'ASC' | 'DESC',
  page: number,
): Promise<number[]> {
  const conditions: Prisma.Sql[] = []
  if (search) conditions.push(Prisma.sql`(t.name ILIKE ${'%' + search + '%'} OR e."episodeTitle" ILIKE ${'%' + search + '%'})`)
  if (type)   conditions.push(Prisma.sql`t."titleType"::text = ${type}`)

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty

  const direction = Prisma.raw(dir)
  const limit     = Prisma.raw(String(PAGE_SIZE))
  const offset    = Prisma.raw(String((page - 1) * PAGE_SIZE))

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT DISTINCT t.id,
           LOWER(COALESCE(t."titleSort", t.name)) AS sort_key,
           LOWER(t.name) AS name_key
    FROM titles t
    LEFT JOIN episodes e ON e."titleId" = t.id
    ${whereClause}
    ORDER BY sort_key ${direction} NULLS LAST,
             name_key ${direction}
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows.map(r => Number(r.id))
}

function getOrderBy(sort: string) {
  switch (sort) {
    case 'newest':      return [{ year: { sort: 'desc' as const, nulls: 'last' as const } }, { name: 'asc' as const }]
    case 'oldest':      return [{ year: { sort: 'asc'  as const, nulls: 'last' as const } }, { name: 'asc' as const }]
    case 'appearances': return { castings: { _count: 'desc' as const } }
    case 'rating':      return [{ titleScore: { sort: 'desc' as const, nulls: 'last' as const } }, { name: 'asc' as const }]
    case 'recent':      return { updatedAt: 'desc' as const }
    default:            return [{ titleSort: { sort: 'asc' as const, nulls: 'last' as const } }, { name: 'asc' as const }]
  }
}

export default async function TitlesPage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string; sort?: string; page?: string }
}) {
  const { search = '', type, sort = '' } = searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const where = {
    ...(type && { titleType: type as any }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { episodes: { some: { episodeTitle: { contains: search, mode: 'insensitive' as const } } } },
      ],
    }),
  }

  const isNameSort = sort === '' || sort === 'name_desc'

  // When searching, include episodes that match so we can show the indicator.
  const episodeSelect = {
    where: search
      ? { episodeTitle: { contains: search, mode: 'insensitive' as const } }
      : { id: { lt: 0 } }, // never matches — avoids fetching all episodes when not searching
    select: { id: true, season: true, episodeNumber: true, episodeTitle: true },
    take: 3,
  }

  const select = {
    id: true,
    name: true,
    year: true,
    endDate: true,
    imageUrl: true,
    updatedAt: true,
    titleType: true,
    episodes: episodeSelect,
  }

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    isNameSort
      ? getNameSortedIds(search, type, sort === 'name_desc' ? 'DESC' : 'ASC', page).then(async (ids) => {
          if (ids.length === 0) return []
          const rows = await prisma.title.findMany({ where: { id: { in: ids } }, select })
          const byId = new Map(rows.map(t => [t.id, t]))
          return ids.map(id => byId.get(id)!).filter(Boolean)
        })
      : prisma.title.findMany({
          where, select,
          orderBy: getOrderBy(sort),
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
  ])

  const castingSummaries = await getCastingSummaries(titles.map(t => t.id))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">Titles</h1>
        <span className="text-xs text-warm-600 dark:text-warm-500">{total} results</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <SearchInput placeholder="Search titles…" />
        <div className="relative">
          <FilterSelect
            paramName="type"
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </FilterSelect>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-warm-600 dark:text-warm-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div className="relative">
          <FilterSelect
            paramName="sort"
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FilterSelect>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-warm-600 dark:text-warm-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {(search || type || sort) && (
          <Link
            href="/titles"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </div>

      {/* Grid */}
      <FadeInGrid key={`${search}-${type}-${sort}-${page}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {titles.map((title) => {
          const castingSummary = (castingSummaries.get(title.id) ?? []).join(' • ') || null
          const matchingEpisodes = title.episodes
          const yearText = [title.year, title.endDate ? new Date(title.endDate).getUTCFullYear() : null]
            .filter(Boolean)
            .join(' - ')

          let episodeIndicator: string | null = null
          if (search && matchingEpisodes.length > 0) {
            if (matchingEpisodes.length === 1) {
              const ep = matchingEpisodes[0]
              const code = ep.season != null && ep.episodeNumber != null
                ? `S${ep.season}E${ep.episodeNumber}`
                : null
              episodeIndicator = [code, ep.episodeTitle].filter(Boolean).join(' · ')
            } else {
              episodeIndicator = `${matchingEpisodes.length} matching episodes`
            }
          }

          return (
            <Link
              key={title.id}
              href={`/titles/${title.id}`}
              className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden hover:border-steve dark:hover:border-warm-200 transition-colors relative"
            >
              {/* Poster */}
              <div className="aspect-[2/3] relative bg-warm-100 dark:bg-warm-700">
                {title.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${title.imageUrl.split('?')[0]}?tr=w-640,q-80&ik-t=${Math.floor(title.updatedAt.getTime() / 1000)}`}
                    alt={title.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-end p-2">
                    <span className="text-[10px] text-warm-400">No poster</span>
                  </div>
                )}
              </div>
              {/* Text — pb-10 reserves space for the absolute badge */}
              <div className="p-3 pb-10 flex flex-col gap-0.5">
                <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight">
                  {title.name}
                </h2>
                {yearText && (
                  <p className="text-xs text-warm-600 dark:text-warm-500 tracking-wide tabular-nums">
                    {yearText}
                  </p>
                )}
                {castingSummary && (
                  <p className="text-xs text-steve line-clamp-2">{castingSummary}</p>
                )}
                {episodeIndicator && (
                  <p className="text-xs text-green-600 dark:text-green-500 line-clamp-2">
                    matches: {episodeIndicator}
                  </p>
                )}
              </div>
              {/* Badge — pinned to bottom-left of card */}
              <span className="absolute bottom-3 left-3">
                <TitleBadge type={title.titleType} />
              </span>
            </Link>
          )
        })}
      </FadeInGrid>

      {titles.length === 0 && (
        <p className="text-warm-600 dark:text-warm-500 text-center py-20">No titles found matching your search.</p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/titles" />
    </div>
  )
}
