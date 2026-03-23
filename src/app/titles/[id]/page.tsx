import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const title = await prisma.title.findUnique({ where: { id: parseInt(params.id) } })
  return { title: title ? `${title.name} — Stevesdropping` : 'Not Found' }
}

const TYPE_LABELS: Record<string, string> = {
  film: 'Film',
  tv_series: 'TV Series',
  tv_movie: 'TV Movie',
  animated: 'Animated',
  short: 'Short',
  documentary: 'Documentary',
  other: 'Other',
}

export default async function TitlePage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const title = await prisma.title.findUnique({
    where: { id },
    include: {
      castings: {
        include: { person: true, character: true, episode: true },
      },
      episodes: {
        orderBy: [{ season: 'asc' }, { episodeNumber: 'asc' }],
        include: {
          castings: {
            include: { person: true, character: true },
          },
        },
      },
    },
  })

  if (!title) notFound()

  // Film-level castings (no episode)
  const filmCastings = title.castings.filter((c) => !c.episodeId)

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <Link href="/titles" className="text-sm text-gray-500 hover:text-white transition-colors">
          ← Titles
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-bold">{title.name}</h1>
          <span className="text-sm text-gray-500 border border-gray-700 rounded px-2 py-1">
            {TYPE_LABELS[title.titleType] ?? title.titleType}
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          {[title.year, title.genre, title.runtime ? `${title.runtime} min` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {title.description && (
          <p className="text-gray-300">{title.description}</p>
        )}
      </div>

      {/* Film-level castings */}
      {filmCastings.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-gray-800 pb-2">Steve Cast</h2>
          <div className="space-y-3">
            {filmCastings.map((c) => (
              <div key={c.id} className="flex items-center gap-4 bg-gray-900 rounded-lg px-4 py-3">
                <Link
                  href={`/people/${c.personId}`}
                  className="font-medium text-white hover:text-sky-400 transition-colors"
                >
                  {c.person.name}
                </Link>
                <span className="text-gray-600 text-sm">as</span>
                <Link
                  href={`/characters/${c.characterId}`}
                  className="text-sky-400 hover:underline text-sm"
                >
                  {c.character.name}
                </Link>
                {c.notes && <span className="text-xs text-gray-500 ml-auto">{c.notes}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Episodes with Steve appearances */}
      {title.episodes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-gray-800 pb-2">
            Episodes with Steve Appearances
          </h2>
          <div className="space-y-3">
            {title.episodes.map((ep) => (
              <div key={ep.id} className="bg-gray-900 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-600 border border-gray-800 rounded px-2 py-0.5 shrink-0 tabular-nums">
                    S{ep.season}E{ep.episodeNumber}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {ep.episodeTitle ?? 'Untitled Episode'}
                    </p>
                    {ep.description && (
                      <p className="text-xs text-gray-500 mt-1">{ep.description}</p>
                    )}
                  </div>
                  {ep.runtime && (
                    <span className="text-xs text-gray-600 shrink-0">{ep.runtime} min</span>
                  )}
                </div>
                {ep.castings.length > 0 && (
                  <div className="pl-16 flex flex-wrap gap-2">
                    {ep.castings.map((c) => (
                      <span key={c.id} className="text-xs text-sky-500">
                        {c.person.name} as {c.character.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {filmCastings.length === 0 && title.episodes.length === 0 && (
        <p className="text-gray-500 text-sm">No Steve castings recorded yet.</p>
      )}
    </div>
  )
}
