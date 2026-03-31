import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { LightboxImage } from '@/components/ui/LightboxImage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Titles — Stevesdropping' }

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
  searchParams: { search?: string; type?: string }
}) {
  const { search = '', type } = searchParams

  const titles = await prisma.title.findMany({
    where: {
      ...(type && { titleType: type as any }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    include: {
      castings: {
        include: { person: true, character: true },
      },
      episodes: { orderBy: [{ season: 'asc' }, { episodeNumber: 'asc' }] },
    },
    orderBy: { year: 'desc' },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">Titles</h1>
        <span className="text-xs text-warm-500">{titles.length} results</span>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search titles…"
          className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 placeholder-warm-500 focus:outline-none focus:border-steve w-64"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-steve hover:bg-steve-hover text-cream text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Filter
        </button>
        {(search || type) && (
          <Link
            href="/titles"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve transition-colors"
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
                    src={title.imageUrl}
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
    </div>
  )
}
