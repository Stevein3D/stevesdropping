import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { TitleBadge } from '@/components/ui/TitleBadge'

export const dynamic = 'force-dynamic'

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

  const byPerson = character.castings.reduce<Record<string, typeof character.castings>>((acc, c) => {
    const key = c.person.name
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-10 max-w-3xl">
      <Link href="/characters" className="text-sm text-warm-500 hover:text-steve transition-colors">
        ← Characters
      </Link>

      {/* Header */}
      <div className="border-b border-cream-border dark:border-warm-700 pb-6 flex gap-6">
        {character.imageUrl && (
          <div className="w-32 shrink-0 aspect-[3/4] relative rounded-lg overflow-hidden">
            <Image
              src={character.imageUrl}
              alt={character.name}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-2">
            <h1 className="font-serif text-4xl font-black text-warm-900 dark:text-warm-200">{character.name}</h1>
            <span className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded capitalize">
              {character.characterType}
            </span>
          </div>
          {character.description && (
            <p className="text-warm-600 dark:text-warm-500 mt-3 leading-relaxed">{character.description}</p>
          )}
        </div>
      </div>

      {/* Actors */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
          <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">
            Actors who played {character.name}
          </h2>
        </div>
        {Object.entries(byPerson).map(([personName, castings]) => (
          <div key={personName} className="space-y-2">
            <div className="flex items-center gap-3">
              {castings[0].person.imageUrl && (
                <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0">
                  <Image
                    src={castings[0].person.imageUrl}
                    alt={personName}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              )}
              <h3>
                <Link
                  href={`/people/${castings[0].personId}`}
                  className="font-serif font-bold text-steve hover:text-steve-hover transition-colors"
                >
                  {personName}
                </Link>
              </h3>
            </div>
            <div className="space-y-2 pl-4 border-l-2 border-cream-border dark:border-warm-700">
              {castings.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  {c.imageUrl && (
                    <div className="w-12 shrink-0 aspect-[3/4] relative rounded overflow-hidden">
                      <Image
                        src={c.imageUrl}
                        alt={`${personName} as ${character.name} in ${c.title.name}`}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3 flex-1">
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
