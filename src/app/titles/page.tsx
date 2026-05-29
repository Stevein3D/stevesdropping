import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
import { FadeInGrid } from '@/components/ui/FadeInGrid'
import { Placeholder } from '@/components/ui/Placeholder'
import { LetterJumper } from '@/components/ui/LetterJumper'

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

// Curated labels. Any TitleType enum value not listed here falls back to a
// humanized version of the raw value, so adding a new enum doesn't require a
// code change for the filter to start working.
const TYPE_LABELS: Record<string, string> = {
  film:          'Film',
  tv_series:     'TV Series',
  tv_movie:      'TV Movie',
  animated:      'Animated',
  short:         'Short',
  documentary:   'Documentary',
  other:         'Other',
}

function humanizeType(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
  genre: string | undefined,
  dir: 'ASC' | 'DESC',
  page: number,
): Promise<number[]> {
  const conditions: Prisma.Sql[] = []
  if (search) conditions.push(Prisma.sql`(t.name ILIKE ${'%' + search + '%'} OR e."episodeTitle" ILIKE ${'%' + search + '%'})`)
  if (type)   conditions.push(Prisma.sql`t."titleType"::text = ${type}`)
  if (genre)  conditions.push(Prisma.sql`t.genre ILIKE ${'%' + genre + '%'}`)

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty

  const direction = Prisma.raw(dir)
  const limit     = Prisma.raw(String(PAGE_SIZE))
  const offset    = Prisma.raw(String((page - 1) * PAGE_SIZE))

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT DISTINCT t.id,
           LOWER(COALESCE(t."titleSort", t.name)) AS sort_key,
           LOWER(t.name) AS name_key,
           t.year AS year_key
    FROM titles t
    LEFT JOIN episodes e ON e."titleId" = t.id
    ${whereClause}
    ORDER BY sort_key ${direction} NULLS LAST,
             name_key ${direction},
             year_key ASC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows.map(r => Number(r.id))
}

// For each starting letter, return the page number that contains the first
// matching title under the current filters/sort direction. Non-letter starts
// (numbers, symbols) get bucketed under '#'.
async function getLetterPageMap(
  search: string,
  type: string | undefined,
  genre: string | undefined,
  dir: 'ASC' | 'DESC',
): Promise<Record<string, number>> {
  const conditions: Prisma.Sql[] = []
  if (search) conditions.push(Prisma.sql`(t.name ILIKE ${'%' + search + '%'} OR e."episodeTitle" ILIKE ${'%' + search + '%'})`)
  if (type)   conditions.push(Prisma.sql`t."titleType"::text = ${type}`)
  if (genre)  conditions.push(Prisma.sql`t.genre ILIKE ${'%' + genre + '%'}`)

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty

  const direction = Prisma.raw(dir)

  const rows = await prisma.$queryRaw<{ letter: string; first_row: number | bigint }[]>`
    WITH ranked AS (
      SELECT DISTINCT
        t.id,
        LOWER(COALESCE(NULLIF(t."titleSort", ''), t.name)) AS sort_key,
        LOWER(t.name) AS name_key,
        t.year AS year_key
      FROM titles t
      LEFT JOIN episodes e ON e."titleId" = t.id
      ${whereClause}
    ),
    numbered AS (
      SELECT
        sort_key,
        ROW_NUMBER() OVER (
          ORDER BY sort_key ${direction} NULLS LAST,
                   name_key ${direction},
                   year_key ASC NULLS LAST
        ) AS rn
      FROM ranked
    )
    SELECT
      CASE
        WHEN SUBSTRING(sort_key FROM 1 FOR 1) ~ '[a-z]'
        THEN UPPER(SUBSTRING(sort_key FROM 1 FOR 1))
        ELSE '#'
      END AS letter,
      MIN(rn) AS first_row
    FROM numbered
    GROUP BY letter
  `

  const map: Record<string, number> = {}
  for (const row of rows) {
    const page = Math.floor((Number(row.first_row) - 1) / PAGE_SIZE) + 1
    map[row.letter] = page
  }
  return map
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
  searchParams: { search?: string; type?: string; genre?: string; sort?: string; page?: string }
}) {
  const { search = '', type, genre, sort = '' } = searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const where = {
    ...(type && { titleType: type as any }),
    ...(genre && { genre: { contains: genre, mode: 'insensitive' as const } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { episodes: { some: { episodeTitle: { contains: search, mode: 'insensitive' as const } } } },
      ],
    }),
  }

  const isNameSort = sort === '' || sort === 'name_desc'

  // When searching, fetch the first matching episode (for the single-match
  // display) plus a true count of all matches (for the "N matching episodes"
  // indicator — array length would cap at `take` and undercount).
  const episodeWhere = search
    ? { episodeTitle: { contains: search, mode: 'insensitive' as const } }
    : { id: { lt: 0 } }

  const episodeSelect = {
    where: episodeWhere,
    select: { id: true, season: true, episodeNumber: true, episodeTitle: true },
    take: 1,
  }

  const select = {
    id: true,
    name: true,
    titleSort: true,
    year: true,
    endDate: true,
    imageUrl: true,
    updatedAt: true,
    titleType: true,
    episodes: episodeSelect,
    _count: { select: { episodes: { where: episodeWhere } } },
  }

  const [total, titles, letterPages, genreRows, typeRows] = await Promise.all([
    prisma.title.count({ where }),
    isNameSort
      ? getNameSortedIds(search, type, genre, sort === 'name_desc' ? 'DESC' : 'ASC', page).then(async (ids) => {
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
    isNameSort
      ? getLetterPageMap(search, type, genre, sort === 'name_desc' ? 'DESC' : 'ASC')
      : Promise.resolve({} as Record<string, number>),
    prisma.title.findMany({
      where: { genre: { not: null } },
      distinct: ['genre'],
      select: { genre: true },
    }),
    prisma.title.findMany({
      distinct: ['titleType'],
      select: { titleType: true },
    }),
  ])

  // `genre` is comma-separated multi-value in some rows ("Comedy, Drama"); split + dedupe.
  const genreOptions = Array.from(new Set(
    genreRows
      .map(r => r.genre ?? '')
      .flatMap(g => g.split(',').map(s => s.trim()))
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b))

  const typeOptions = typeRows
    .map(r => [r.titleType as string, TYPE_LABELS[r.titleType as string] ?? humanizeType(r.titleType as string)] as [string, string])
    .sort(([, a], [, b]) => a.localeCompare(b))

  const castingSummaries = await getCastingSummaries(titles.map(t => t.id))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Tag the first tile of each letter group with an anchor id so LetterJumper
  // can scroll to it. Only meaningful under a name sort.
  const firstOfLetter = new Map<number, string>()
  if (isNameSort) {
    let prev = ''
    for (const t of titles) {
      const c = (t.titleSort ?? t.name).trim()[0]?.toLowerCase() ?? ''
      const letter = /[a-z]/.test(c) ? c.toUpperCase() : '#'
      if (letter !== prev) firstOfLetter.set(t.id, letter)
      prev = letter
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">Titles</h1>
        <span className="text-xs text-warm-600 dark:text-warm-500">{total} results</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <SearchInput placeholder="Search titles…" />
        {typeOptions.length > 0 && (
          <FilterDropdown
            paramName="type"
            options={[{ value: '', label: 'All types' }, ...typeOptions.map(([value, label]) => ({ value, label }))]}
          />
        )}
        {genreOptions.length > 0 && (
          <FilterDropdown
            paramName="genre"
            options={[{ value: '', label: 'All genres' }, ...genreOptions.map(g => ({ value: g, label: g }))]}
          />
        )}
        <FilterDropdown
          paramName="sort"
          options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        />
        {isNameSort && Object.keys(letterPages).length > 0 && (
          <LetterJumper letterPages={letterPages} basePath="/titles" />
        )}
        {(search || type || genre || sort) && (
          <Link
            href="/titles"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/titles" />

      {/* Grid */}
      <FadeInGrid key={`${search}-${type}-${genre ?? ''}-${sort}-${page}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {titles.map((title) => {
          const castingSummary = (castingSummaries.get(title.id) ?? []).join(' • ') || null
          const matchingEpisodes = title.episodes
          const matchingEpisodeCount = title._count.episodes
          const yearText = [title.year, title.endDate ? new Date(title.endDate).getUTCFullYear() : null]
            .filter(Boolean)
            .join(' - ')

          let episodeIndicator: string | null = null
          if (search && matchingEpisodeCount > 0) {
            if (matchingEpisodeCount === 1 && matchingEpisodes[0]) {
              const ep = matchingEpisodes[0]
              const code = ep.season != null && ep.episodeNumber != null
                ? `S${ep.season}E${ep.episodeNumber}`
                : null
              episodeIndicator = [code, ep.episodeTitle].filter(Boolean).join(' · ')
            } else {
              episodeIndicator = `${matchingEpisodeCount} matching episodes`
            }
          }

          const anchorLetter = firstOfLetter.get(title.id)
          const titleHref = search
            ? `/titles/${title.id}?q=${encodeURIComponent(search)}`
            : `/titles/${title.id}`
          return (
            <Link
              key={title.id}
              id={anchorLetter ? `letter-${anchorLetter}` : undefined}
              href={titleHref}
              className={`bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden hover:border-steve dark:hover:border-warm-200 hover:-translate-y-0.5 transition relative ${anchorLetter ? 'scroll-mt-24' : ''}`}
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
                  <Placeholder name={title.name} variant="poster" className="absolute inset-0 rounded-none" />
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
