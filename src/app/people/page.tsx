import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'People — Stevesdropping' }

const PAGE_SIZE = 48

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string; page?: string }
}) {
  const { search = '', type } = searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const where = {
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    ...(type && { personType: type as any }),
  }

  const [total, people] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      select: {
        id: true,
        name: true,
        personType: true,
        birthYear: true,
        deathYear: true,
        imageUrl: true,
        updatedAt: true,
        _count: { select: { castings: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">People</h1>
        <span className="text-xs text-warm-500">{total} results</span>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <SearchInput placeholder="Search by name…" />
        <div className="relative">
          <select
            name="type"
            defaultValue={type ?? ''}
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
          >
            <option value="">All types</option>
            <option value="actor">Actor</option>
            <option value="celebrity">Celebrity</option>
            <option value="musician">Musician</option>
            <option value="athlete">Athlete</option>
            <option value="other">Other</option>
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-warm-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <button
          type="submit"
          className="bg-steve hover:bg-steve-hover text-cream text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Filter
        </button>
        {(search || type) && (
          <Link
            href="/people"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden hover:border-steve dark:hover:border-warm-200 transition-colors"
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
            {/* Text */}
            <div className="p-3">
              {person.birthYear && (
                <p className="text-xs text-warm-500 tracking-wide mb-0.5">
                  b. {person.birthYear}
                  {person.deathYear ? ` — d. ${person.deathYear}` : ''}
                </p>
              )}
              <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight mb-1">
                {person.name}
              </h2>
              {person._count.castings > 0 && (
                <p className="text-xs text-steve mb-1.5">
                  {person._count.castings} casting{person._count.castings !== 1 ? 's' : ''}
                </p>
              )}
              <span className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded capitalize">
                {person.personType}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {people.length === 0 && (
        <p className="text-warm-500 text-center py-20">No people found matching your search.</p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/people" />
    </div>
  )
}
