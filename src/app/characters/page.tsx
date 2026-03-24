import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">Characters</h1>
        <span className="text-xs text-warm-500">{characters.length} results</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {characters.map((character) => {
          const actors = Array.from(new Map(character.castings.map((c) => [c.personId, c.person])).values())

          return (
            <Link
              key={character.id}
              href={`/characters/${character.id}`}
              className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-4 hover:border-steve transition-colors"
            >
              <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight mb-1">
                {character.name}
              </h2>
              <p className="text-xs text-steve mb-2">
                {character.castings.length} appearance{character.castings.length !== 1 ? 's' : ''}
              </p>
              {character.description && (
                <p className="text-sm text-warm-600 dark:text-warm-500 line-clamp-2 mb-3">
                  {character.description}
                </p>
              )}
              {actors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {actors.map((a) => (
                    <span
                      key={a.id}
                      className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <span className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded capitalize">
                  {character.characterType}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
