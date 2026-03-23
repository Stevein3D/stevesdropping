import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Characters — Stevesdropping' }

export default async function CharactersPage() {
  const characters = await prisma.character.findMany({
    include: {
      castings: {
        include: { person: true, title: true, episode: true },
        orderBy: { title: { year: 'desc' } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Characters</h1>
        <span className="text-sm text-gray-500">{characters.length} results</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {characters.map((character) => {
          // Unique actors for this character
          const actors = [...new Map(character.castings.map((c) => [c.personId, c.person])).values()]

          return (
            <Link
              key={character.id}
              href={`/characters/${character.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-sky-500 transition-colors group space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-lg text-white group-hover:text-sky-400 transition-colors">
                  {character.name}
                </h2>
                <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5 capitalize shrink-0">
                  {character.characterType}
                </span>
              </div>

              {character.description && (
                <p className="text-sm text-gray-400 line-clamp-2">{character.description}</p>
              )}

              {actors.length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="text-gray-600">Played by:</p>
                  <div className="flex flex-wrap gap-2">
                    {actors.map((a) => (
                      <span
                        key={a.id}
                        className="bg-gray-800 rounded px-2 py-0.5 text-gray-300"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-sky-500">
                {character.castings.length} appearance{character.castings.length !== 1 ? 's' : ''}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
