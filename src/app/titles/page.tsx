import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { LightboxImage } from '@/components/ui/LightboxImage'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

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

export default async function TitlesPage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string; page?: string }
}) {
  const { search = '', type } = searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const where = {
    ...(type && { titleType: type as any }),
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  }

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({
      where,
      select: {
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
      },
      orderBy: [{ titleSort: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">Titles</h1>
        <span className="text-xs text-warm-500">{total} results</span>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <SearchInput placeholder="Search titles…" />
        <div className="relative">
          <select
            name="type"
            defaultValue={type ?? ''}
            className="appearance-none bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg pl-4 pr-9 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
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
            href="/titles"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* TV Guide list */}
      <div className="border border-cream-border dark:border-warm-700 rounded-lg overflow-hidden">
        {titles.map((title) => {
          const uniqueChars  = Array.from(new Set(title.castings.map((c) => c.character.name)))
          const uniquePeople = Array.from(new Set(title.castings.map((c) => c.person.name)))
          const castingSummary = uniqueChars.length > 0
            ? `${uniqueChars.join(', ')} · ${uniquePeople.join(', ')}`
            : null

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
              <span className="font-serif text-sm font-bold text-warm-500 tabular-nums">{title.year}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-warm-900 dark:text-warm-200 truncate">{title.name}</p>
                {castingSummary && (
                  <p className="text-xs text-warm-600 dark:text-warm-500 mt-0.5 truncate">{castingSummary}</p>
                )}
              </div>
              <TitleBadge type={title.titleType} />
            </Link>
          )
        })}
      </div>

      {titles.length === 0 && (
        <p className="text-warm-500 text-center py-20">No titles found matching your search.</p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/titles" />
    </div>
  )
}
