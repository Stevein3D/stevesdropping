import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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
        include: {
          character: true,
          title: true,
          episode: true,
        },
        orderBy: { title: { year: 'desc' } },
      },
    },
  })

  if (!person) notFound()

  // Group castings by character
  const byCharacter = person.castings.reduce<Record<string, typeof person.castings>>((acc, c) => {
    const key = c.character.name
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <Link href="/people" className="text-sm text-gray-500 hover:text-white transition-colors">
          ← People
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-bold">{person.name}</h1>
          <span className="text-sm text-gray-500 border border-gray-700 rounded px-2 py-1 capitalize">
            {person.personType}
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          {[
            person.birthYear && `b. ${person.birthYear}`,
            person.deathYear && `d. ${person.deathYear}`,
            person.nationality,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {person.bio && <p className="text-gray-300 mt-3">{person.bio}</p>}
      </div>

      {/* Castings */}
      {person.castings.length > 0 ? (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b border-gray-800 pb-2">Filmography</h2>
          {Object.entries(byCharacter).map(([charName, castings]) => (
            <div key={charName} className="space-y-2">
              <h3 className="text-sky-400 font-medium">
                as{' '}
                <Link
                  href={`/characters/${castings[0].characterId}`}
                  className="hover:underline"
                >
                  {charName}
                </Link>
              </h3>
              <div className="space-y-2 pl-4 border-l border-gray-800">
                {castings.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <span className="text-gray-500 text-sm w-10 shrink-0">{c.title.year}</span>
                    <div>
                      <Link
                        href={`/titles/${c.titleId}`}
                        className="text-white hover:text-sky-400 transition-colors text-sm font-medium"
                      >
                        {c.title.name}
                      </Link>
                      {c.episode && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          S{c.episode.season}E{c.episode.episodeNumber}
                          {c.episode.episodeTitle ? ` · "${c.episode.episodeTitle}"` : ''}
                        </p>
                      )}
                      <span className="text-xs text-gray-600 capitalize ml-2 border border-gray-800 rounded px-1">
                        {c.title.titleType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-gray-500 text-sm">No castings recorded yet.</p>
      )}
    </div>
  )
}
