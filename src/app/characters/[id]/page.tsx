import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { LightboxImage } from '@/components/ui/LightboxImage'
import { EpisodeList } from '@/components/ui/EpisodeList'

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
      },
    },
  })

  if (!character) notFound()

  type EpisodeEntry = { castingId: number; season: number | null; episodeNumber: number | null; episodeTitle: string | null }
  type TitleGroup = {
    titleId: number
    title: (typeof character.castings)[0]['title']
    castingImageUrl: string | null
    episodes: EpisodeEntry[]
  }

  // Group by person → title
  const personMap: Record<string, { personId: number; personImageUrl: string | null; titles: Record<number, TitleGroup> }> = {}
  for (const c of character.castings) {
    const personName = c.person.name
    if (!personMap[personName]) personMap[personName] = { personId: c.personId, personImageUrl: c.person.imageUrl, titles: {} }
    if (!personMap[personName].titles[c.titleId]) {
      personMap[personName].titles[c.titleId] = {
        titleId: c.titleId,
        title: c.title,
        castingImageUrl: c.imageUrl,
        episodes: [],
      }
    }
    if (c.episode) {
      personMap[personName].titles[c.titleId].episodes.push({
        castingId: c.id,
        season: c.episode.season,
        episodeNumber: c.episode.episodeNumber,
        episodeTitle: c.episode.episodeTitle,
      })
    }
  }

  // Sort titles earliest to most recent; sort episodes by season then episode number
  const byPerson = Object.entries(personMap).map(([personName, { personId, personImageUrl, titles }]) => ({
    personName,
    personId,
    personImageUrl,
    titles: Object.values(titles)
      .sort((a, b) => {
        const aVal = a.title.releaseDate ? new Date(a.title.releaseDate).getTime() : (a.title.year ?? 0) * 1e6
        const bVal = b.title.releaseDate ? new Date(b.title.releaseDate).getTime() : (b.title.year ?? 0) * 1e6
        return aVal - bVal
      })
      .map((tg) => ({
        ...tg,
        episodes: [...tg.episodes].sort((a, b) =>
          (a.season ?? 0) !== (b.season ?? 0)
            ? (a.season ?? 0) - (b.season ?? 0)
            : (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
        ),
      })),
  }))

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
        {byPerson.map(({ personName, personId, personImageUrl, titles }) => (
          <div key={personName} className="space-y-2">
            <div className="flex items-center gap-3">
              {personImageUrl && (
                <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0">
                  <LightboxImage
                    src={personImageUrl}
                    alt={personName}
                    containerClassName="absolute inset-0"
                    sizes="32px"
                    scale={6}
                  />
                </div>
              )}
              <h3>
                <Link
                  href={`/people/${personId}`}
                  className="font-serif font-bold text-steve hover:text-steve-hover transition-colors"
                >
                  {personName}
                </Link>
              </h3>
            </div>
            <div className="space-y-2 pl-4 border-l-2 border-cream-border dark:border-warm-700">
              {titles.map((tg) => (
                <div key={tg.titleId} className="flex items-start gap-3">
                  {tg.castingImageUrl && (
                    <div className="w-12 shrink-0 aspect-[3/4] relative rounded overflow-hidden">
                      <LightboxImage
                        src={tg.castingImageUrl}
                        alt={`${personName} as ${character.name} in ${tg.title.name}`}
                        containerClassName="absolute inset-0"
                        sizes="48px"
                        scale={6}
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3 flex-1">
                    <span className="font-serif text-sm font-bold text-warm-500 w-10 shrink-0 tabular-nums">
                      {tg.title.year}
                    </span>
                    <div>
                      <Link
                        href={`/titles/${tg.titleId}`}
                        className="text-sm font-medium text-warm-900 dark:text-warm-200 hover:text-steve transition-colors"
                      >
                        {tg.title.name}
                      </Link>
                      <span className="inline-block ml-[8px]">
                        <TitleBadge type={tg.title.titleType} />
                      </span>
                      {tg.episodes.length > 0 && (
                        <EpisodeList episodes={tg.episodes} />
                      )}
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
