import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Titles — Stevesdropping' }

const TYPE_LABELS: Record<string, string> = {
  film: 'Film',
  tv_series: 'TV Series',
  tv_movie: 'TV Movie',
  animated: 'Animated',
  short: 'Short',
  documentary: 'Documentary',
  other: 'Other',
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Titles</h1>
        <span className="text-sm text-gray-500">{titles.length} results</span>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search titles…"
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 w-64"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Filter
        </button>
        {(search || type) && (
          <Link
            href="/titles"
            className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* List */}
      <div className="space-y-3">
        {titles.map((title) => {
          const uniqueChars = Array.from(new Set(title.castings.map((c) => c.character.name)))
          const uniquePeople = Array.from(new Set(title.castings.map((c) => c.person.name)))

          return (
            <Link
              key={title.id}
              href={`/titles/${title.id}`}
              className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-sky-500 transition-colors group"
            >
              <div className="text-2xl font-bold text-gray-700 w-12 shrink-0 text-right tabular-nums">
                {title.year}
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-white group-hover:text-sky-400 transition-colors">
                    {title.name}
                  </h2>
                  <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5">
                    {TYPE_LABELS[title.titleType] ?? title.titleType}
                  </span>
                  {title.runtime && (
                    <span className="text-xs text-gray-600">{title.runtime} min</span>
                  )}
                </div>
                {title.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">{title.description}</p>
                )}
                {uniqueChars.length > 0 && (
                  <p className="text-xs text-sky-600">
                    {uniqueChars.join(', ')}
                    {' · '}
                    <span className="text-gray-600">{uniquePeople.join(', ')}</span>
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {titles.length === 0 && (
        <p className="text-gray-500 text-center py-20">No titles found matching your search.</p>
      )}
    </div>
  )
}
