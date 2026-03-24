import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TitleBadge } from '@/components/ui/TitleBadge'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const person = await prisma.person.findUnique({ where: { id: parseInt(params.id) } })
  return { title: person ? `${person.name} — Stevesdropping` : 'Not Found' }
}

export default async function PersonPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      castings: {
        include: { character: true, title: true, episode: true },
        orderBy: { title: { year: 'desc' } },
      },
    },
  })

  if (!person) notFound()

  const byCharacter = person.castings.reduce<Record<string, typeof person.castings>>((acc, c) => {
    const key = c.character.name
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-10 max-w-3xl">
      <Link href="/people" className="text-sm text-warm-500 hover:text-steve transition-colors">
        ← People
      </Link>

      {/* Header */}
      <div className="border-b border-cream-border dark:border-warm-700 pb-6">
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <h1 className="font-serif text-4xl font-black text-warm-900 dark:text-warm-200">{person.name}</h1>
          <span className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded capitalize">
            {person.personType}
          </span>
        </div>
        <p className="text-sm text-warm-500">
          {[
            person.birthYear && `b. ${person.birthYear}`,
            person.deathYear && `d. ${person.deathYear}`,
            person.nationality,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {person.bio && (
          <p className="text-warm-600 dark:text-warm-500 mt-3 leading-relaxed">{person.bio}</p>
        )}
      </div>

      {/* Filmography */}
      {person.castings.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
            <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">Filmography</h2>
          </div>
          {Object.entries(byCharacter).map(([charName, castings]) => (
            <div key={charName} className="space-y-2">
              <h3 className="text-sm text-warm-600 dark:text-warm-500">
                as{' '}
                <Link
                  href={`/characters/${castings[0].characterId}`}
                  className="font-serif font-bold text-steve hover:text-steve-hover transition-colors"
                >
                  {charName}
                </Link>
              </h3>
              <div className="space-y-2 pl-4 border-l-2 border-cream-border dark:border-warm-700">
                {castings.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <span className="font-serif text-sm font-bold text-warm-500 w-10 shrink-0 tabular-nums">
                      {c.title.year}
                    </span>
                    <div>
                      <Link
                        href={`/titles/${c.titleId}`}
                        className="text-sm font-medium text-warm-900 dark:text-warm-200 hover:text-steve transition-colors"
                      >
                        {c.title.name}
                      </Link>
                      {c.episode && (
                        <p className="text-xs text-warm-500 mt-0.5">
                          S{c.episode.season}E{c.episode.episodeNumber}
                          {c.episode.episodeTitle ? ` · "${c.episode.episodeTitle}"` : ''}
                        </p>
                      )}
                      <span className="inline-block mt-1">
                        <TitleBadge type={c.title.titleType} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-warm-500 text-sm">No castings recorded yet.</p>
      )}
    </div>
  )
}
