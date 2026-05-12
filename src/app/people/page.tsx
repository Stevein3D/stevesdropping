import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { FadeInGrid } from '@/components/ui/FadeInGrid'

export const revalidate = 60

export const metadata = {
  title: 'People',
  description: 'Every actor, comedian, musician, and notable figure named Steve — cataloged on Stevesdropping.',
  openGraph: {
    title: 'People — Stevesdropping',
    description: 'Every actor, comedian, musician, and notable figure named Steve — cataloged on Stevesdropping.',
    url: '/people',
  },
  twitter: {
    title: 'People — Stevesdropping',
    description: 'Every actor, comedian, musician, and notable figure named Steve — cataloged on Stevesdropping.',
  },
  alternates: { canonical: '/people' },
}

const PAGE_SIZE = 45

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(date: Date): string {
  return `${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()} ${date.getUTCFullYear()}`
}

type SortOption = 'name_asc' | 'name_desc' | 'appearances' | 'oldest' | 'youngest' | 'recent'

const SORT_OPTIONS: { value: SortOption | ''; label: string }[] = [
  { value: '',            label: 'A–Z' },
  { value: 'name_desc',  label: 'Z–A' },
  { value: 'appearances', label: 'Most appearances' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'youngest',   label: 'Youngest first' },
  { value: 'recent',     label: 'Recently added' },
]

// A–Z and Z–A use raw SQL so LOWER() can be applied, preventing case-sensitive
// ASCII ordering from putting "de la Cruz" above "Zupan" in a DESC sort.
async function getNameSortedIds(
  search: string,
  type: string | undefined,
  dir: 'ASC' | 'DESC',
  page: number,
): Promise<number[]> {
  const conditions: Prisma.Sql[] = []
  if (search) conditions.push(Prisma.sql`name ILIKE ${'%' + search + '%'}`)
  if (type)   conditions.push(Prisma.sql`"personType"::text = ${type}`)

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty

  const direction = Prisma.raw(dir)
  const limit     = Prisma.raw(String(PAGE_SIZE))
  const offset    = Prisma.raw(String((page - 1) * PAGE_SIZE))

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM persons
    ${whereClause}
    ORDER BY LOWER("lastName") ${direction} NULLS LAST,
             LOWER("firstName") ${direction}
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows.map(r => Number(r.id))
}

function getOrderBy(sort: string) {
  switch (sort) {
    case 'appearances': return { castings: { _count: 'desc' as const } }
    case 'oldest':      return [{ birthYear: { sort: 'asc' as const, nulls: 'last' as const } }, { lastName: 'asc' as const }]
    case 'youngest':    return [{ birthYear: { sort: 'desc' as const, nulls: 'last' as const } }, { lastName: 'asc' as const }]
    case 'recent':      return { updatedAt: 'desc' as const }
    default:            return { name: 'asc' as const } // fallback, not reached for name sorts
  }
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string; sort?: string; page?: string }
}) {
  const { search = '', type, sort = '' } = searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const where = {
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    ...(type && { personType: type as any }),
  }

  const isNameSort = sort === '' || sort === 'name_desc'
  const select = {
    id: true, name: true, personType: true,
    birthDate: true, deathDate: true, birthYear: true, deathYear: true,
    imageUrl: true, updatedAt: true,
    _count: { select: { castings: true } },
  } as const

  const [total, people] = await Promise.all([
    prisma.person.count({ where }),
    isNameSort
      ? getNameSortedIds(search, type, sort === 'name_desc' ? 'DESC' : 'ASC', page).then(async (ids) => {
          if (ids.length === 0) return []
          const rows = await prisma.person.findMany({ where: { id: { in: ids } }, select })
          const byId = new Map(rows.map(p => [p.id, p]))
          return ids.map(id => byId.get(id)!).filter(Boolean)
        })
      : prisma.person.findMany({
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
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">People</h1>
        <span className="text-xs text-warm-600 dark:text-warm-500">{total} results</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <SearchInput placeholder="Search by name…" />
        <div className="relative">
          <FilterSelect
            paramName="type"
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
          >
            <option value="">All types</option>
            <option value="actor">Actor</option>
            <option value="celebrity">Celebrity</option>
            <option value="musician">Musician</option>
            <option value="athlete">Athlete</option>
            <option value="other">Other</option>
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
            href="/people"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </div>

      {/* Grid */}
      <FadeInGrid key={`${search}-${type}-${sort}-${page}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden hover:border-steve dark:hover:border-warm-200 transition-colors relative"
          >
            {/* Photo */}
            <div className="aspect-[3/4] relative bg-warm-100 dark:bg-warm-700">
              {person.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${person.imageUrl.split('?')[0]}?tr=w-640,q-80&ik-t=${Math.floor(person.updatedAt.getTime() / 1000)}`}
                  alt={person.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-end p-2">
                  <span className="text-[10px] text-warm-400">No photo</span>
                </div>
              )}
            </div>
            {/* Text — pb-10 reserves space for the absolute badge */}
            <div className="p-3 pb-10 flex flex-col gap-0.5">
              <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight">
                {person.name}
              </h2>
              {(person.birthDate || person.birthYear || person.deathDate || person.deathYear) && (
                <p className="text-xs text-warm-600 dark:text-warm-500 tracking-wide">
                  {(person.birthDate || person.birthYear) ? (
                    <>
                      b. {person.birthDate ? formatDate(person.birthDate) : person.birthYear}
                      {(person.deathDate || person.deathYear) && (
                        <> — d. {person.deathDate ? formatDate(person.deathDate) : person.deathYear}</>
                      )}
                    </>
                  ) : (
                    <>d. {person.deathDate ? formatDate(person.deathDate) : person.deathYear}</>
                  )}
                </p>
              )}
              {person._count.castings > 0 && (
                <p className="text-xs text-steve">
                  {person._count.castings} appearance{person._count.castings !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            {/* Badge — pinned to bottom-left of card */}
            <span className="absolute bottom-3 left-3 text-xs bg-warm-600 text-cream px-2 py-0.5 rounded capitalize">
              {person.personType}
            </span>
          </Link>
        ))}
      </FadeInGrid>

      {people.length === 0 && (
        <p className="text-warm-600 dark:text-warm-500 text-center py-20">No people found matching your search.</p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/people" />
    </div>
  )
}
