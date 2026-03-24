import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const title = await prisma.title.findUnique({ where: { id: parseInt(params.id) } })
  return { title: title ? `${title.name} — Stevesdropping` : 'Not Found' }
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

  const filmCastings = title.castings.filter((c) => !c.episodeId)

  return (
    <div className="space-y-10 max-w-3xl">
      <Link href="/titles" className="text-sm text-warm-500 hover:text-steve transition-colors">
        ← Titles
      </Link>

      {/* Header */}
      <div className="border-b border-cream-border dark:border-warm-700 pb-6">
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <h1 className="font-serif text-4xl font-black text-warm-900 dark:text-warm-200">{title.name}</h1>
          <TitleBadge type={title.titleType} />
        </div>
        <p className="text-sm text-warm-500">
          {[title.year, title.genre, title.runtime ? `${title.runtime} min` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {title.description && (
          <p className="text-warm-600 dark:text-warm-500 mt-3 leading-relaxed">{title.description}</p>
        )}
      </div>

      {/* Film-level castings */}
      {filmCastings.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
            <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">Steve Cast</h2>
          </div>
          <div className="space-y-2">
            {filmCastings.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg px-4 py-3"
              >
                <Link
                  href={`/people/${c.personId}`}
                  className="font-serif font-bold text-warm-900 dark:text-warm-200 hover:text-steve transition-colors"
                >
                  {c.person.name}
                </Link>
                <span className="text-warm-500 text-sm">as</span>
                <Link
                  href={`/characters/${c.characterId}`}
                  className="text-steve hover:text-steve-hover transition-colors text-sm font-medium"
                >
                  {c.character.name}
                </Link>
                {c.notes && <span className="text-xs text-warm-500 ml-auto">{c.notes}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Episodes */}
      {title.episodes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
            <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">
              Episodes with Steve Appearances
            </h2>
          </div>
          <div className="space-y-2">
            {title.episodes.map((ep) => (
              <div
                key={ep.id}
                className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="font-serif text-xs font-bold text-warm-500 border border-cream-border dark:border-warm-700 rounded px-2 py-0.5 shrink-0 tabular-nums">
                    S{ep.season}E{ep.episodeNumber}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warm-900 dark:text-warm-200">
                      {ep.episodeTitle ?? 'Untitled Episode'}
                    </p>
                    {ep.description && (
                      <p className="text-xs text-warm-500 mt-1">{ep.description}</p>
                    )}
                    {ep.castings.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {ep.castings.map((c) => (
                          <span key={c.id} className="text-xs text-warm-600 dark:text-warm-500">
                            <span className="text-steve font-medium">{c.person.name}</span>
                            {' '}as {c.character.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {ep.runtime && (
                    <span className="text-xs text-warm-500 shrink-0">{ep.runtime} min</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filmCastings.length === 0 && title.episodes.length === 0 && (
        <p className="text-warm-500 text-sm">No Steve castings recorded yet.</p>
      )}
    </div>
  )
}
