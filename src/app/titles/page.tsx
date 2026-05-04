import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { LightboxImage } from '@/components/ui/LightboxImage'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Titles — Stevesdropping' }

const PAGE_SIZE = 48

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
    imageUrl: true,
    updatedAt: true,
    titleType: true,
    castings: {
      select: {
        character: { select: { name: true } },
        person:    { select: { name: true } },
      },
    },
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

      {/* TV Guide list */}
      <div className="border border-cream-border dark:border-warm-700 rounded-lg overflow-hidden">
        {titles.map((title) => {
          const seen = new Set<string>()
          const uniquePairs: string[] = []
          for (const c of title.castings) {
            const key = `${c.person.name}|${c.character.name}`
            if (!seen.has(key)) {
              seen.add(key)
              uniquePairs.push(`${c.person.name} as ${c.character.name}`)
            }
          }
          const castingSummary = uniquePairs.length > 0 ? uniquePairs.join(' • ') : null
          const matchingEpisodes = title.episodes

          // Format the episode match indicator
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
              className="grid grid-cols-[44px_52px_1fr_auto] items-center gap-3 px-3 py-2 border-b border-cream-border dark:border-warm-700 bg-cream dark:bg-warm-800 hover:bg-cream-card dark:hover:bg-warm-50/5 transition-colors last:border-b-0"
            >
              {/* Poster thumbnail */}
              <div className="aspect-[2/3] relative rounded overflow-hidden bg-warm-100 dark:bg-warm-700 shrink-0">
                {title.imageUrl && (
                  <LightboxImage
                    src={`${title.imageUrl.split('?')[0]}?ik-t=${Math.floor(title.updatedAt.getTime() / 1000)}`}
                    thumbnailSrc={`${title.imageUrl.split('?')[0]}?tr=w-88,q-80&ik-t=${Math.floor(title.updatedAt.getTime() / 1000)}`}
                    alt={title.name}
                    containerClassName="absolute inset-0"
                    sizes="44px"
                    scale={6}
                  />
                )}
              </div>
              <span className="font-serif text-sm font-bold text-warm-600 dark:text-warm-500 tabular-nums">{title.year}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-warm-900 dark:text-warm-200 truncate">{title.name}</p>
                {castingSummary && (
                  <p className="text-xs text-warm-600 dark:text-warm-500 mt-0.5 truncate">{castingSummary}</p>
                )}
                {episodeIndicator && (
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 truncate">
                    includes matching episode: {episodeIndicator}
                  </p>
                )}
              </div>
              <TitleBadge type={title.titleType} />
            </Link>
          )
        })}
      </div>

      {titles.length === 0 && (
        <p className="text-warm-600 dark:text-warm-500 text-center py-20">No titles found matching your search.</p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/titles" />
    </div>
  )
}
