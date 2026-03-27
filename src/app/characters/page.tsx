import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {characters.map((character) => {
          const actors = Array.from(new Map(character.castings.map((c) => [c.personId, c.person])).values())

          return (
            <Link
              key={character.id}
              href={`/characters/${character.id}`}
              className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden hover:border-steve transition-colors"
            >
              {/* Image */}
              <div className="aspect-[3/4] relative bg-warm-100 dark:bg-warm-700">
                {character.imageUrl ? (
                  <Image
                    src={character.imageUrl}
                    alt={character.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-end p-2">
                    <span className="text-[10px] text-warm-400">No image</span>
                  </div>
                )}
              </div>
              {/* Text */}
              <div className="p-3">
                <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight mb-1">
                  {character.name}
                </h2>
                <p className="text-xs text-steve mb-2">
                  {character.castings.length} appearance{character.castings.length !== 1 ? 's' : ''}
                </p>
                {actors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
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
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
