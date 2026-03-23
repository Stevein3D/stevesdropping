import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const character = await prisma.character.findUnique({ where: { id: parseInt(params.id) } })
  return { title: character ? `${character.name} — Stevesdropping` : 'Not Found' }
}

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      castings: {
        include: { person: true, title: true, episode: true },
        orderBy: { title: { year: 'asc' } },
      },
    },
  })

  if (!character) notFound()

  // Group by person
  const byPerson = character.castings.reduce<Record<string, typeof character.castings>>((acc, c) => {
    const key = c.person.name
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <Link href="/characters" className="text-sm text-gray-500 hover:text-white transition-colors">
          ← Characters
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-4xl font-bold">{character.name}</h1>
          <span className="text-sm text-gray-500 border border-gray-700 rounded px-2 py-1 capitalize">
            {character.characterType}
          </span>
        </div>
        {character.description && (
          <p className="text-gray-300 mt-2">{character.description}</p>
        )}
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b border-gray-800 pb-2">
          Actors who played {character.name}
        </h2>
        {Object.entries(byPerson).map(([personName, castings]) => (
          <div key={personName} className="space-y-2">
            <h3 className="font-medium">
              <Link
                href={`/people/${castings[0].personId}`}
                className="text-sky-400 hover:underline"
              >
                {personName}
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
    </div>
  )
}
