import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { EpisodeList } from '@/components/ui/EpisodeList'
import { LightboxImage } from '@/components/ui/LightboxImage'

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
      },
    },
  })

  if (!person) notFound()

  type EpisodeEntry = { castingId: number; season: number | null; episodeNumber: number | null; episodeTitle: string | null }
  type TitleGroup = {
    titleId: number
    title: (typeof person.castings)[0]['title']
    castingImageUrl: string | null
    hasFilmLevel: boolean
    episodes: EpisodeEntry[]
  }

  // Group by character → title
  const charMap: Record<string, { characterId: number; characterImageUrl: string | null; titles: Record<number, TitleGroup> }> = {}
  for (const c of person.castings) {
    const charName = c.character.name
    if (!charMap[charName]) charMap[charName] = { characterId: c.characterId, characterImageUrl: c.character.imageUrl, titles: {} }
    if (!charMap[charName].titles[c.titleId]) {
      charMap[charName].titles[c.titleId] = {
        titleId: c.titleId,
        title: c.title,
        castingImageUrl: c.imageUrl,
        hasFilmLevel: false,
        episodes: [],
      }
    }
    if (c.episode) {
      charMap[charName].titles[c.titleId].episodes.push({
        castingId: c.id,
        season: c.episode.season,
        episodeNumber: c.episode.episodeNumber,
        episodeTitle: c.episode.episodeTitle,
      })
    } else {
      charMap[charName].titles[c.titleId].hasFilmLevel = true
    }
  }

  // Sort titles by releaseDate / year desc; sort episodes by season then episode number
  const byCharacter = Object.entries(charMap).map(([charName, { characterId, characterImageUrl, titles }]) => ({
    charName,
    characterId,
    characterImageUrl,
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
      <Link href="/people" className="text-sm text-warm-500 hover:text-steve transition-colors">
        ← People
      </Link>

      {/* Header */}
      <div className="flex gap-6">
        {person.imageUrl && (
          <div className="w-32 shrink-0 aspect-[3/4] relative rounded-lg overflow-hidden">
            <Image
              src={person.imageUrl}
              alt={person.name}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
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
      </div>

      {/* Filmography */}
      {person.castings.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
            <h2 className="font-serif text-xl font-bold text-warm-900 dark:text-warm-200">Filmography</h2>
          </div>
          {byCharacter.map(({ charName, characterId, characterImageUrl, titles }) => (
            <div key={charName} className="space-y-2">
              <div className="flex items-center gap-2">
                {characterImageUrl && (
                  <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0">
                    <LightboxImage
                      src={characterImageUrl}
                      alt={charName}
                      containerClassName="absolute inset-0"
                      sizes="32px"
                      scale={6}
                    />
                  </div>
                )}
                <h3 className="text-base text-warm-600 dark:text-warm-500">
                  as{' '}
                  <Link
                    href={`/characters/${characterId}`}
                    className="font-serif font-bold text-steve hover:text-steve-hover transition-colors"
                  >
                    {charName}
                  </Link>
                </h3>
              </div>
              <div className="space-y-2 pl-4 border-l-2 border-cream-border dark:border-warm-700">
                {titles.map((tg) => (
                  <div key={tg.titleId} className="flex items-start gap-3">
                    {tg.castingImageUrl && (
                      <div className="w-12 shrink-0 aspect-[3/4] relative rounded overflow-hidden">
                        <Image
                          src={tg.castingImageUrl}
                          alt={`${person.name} as ${charName} in ${tg.title.name}`}
                          fill
                          className="object-cover"
                          sizes="48px"
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
      ) : (
        <p className="text-warm-500 text-sm">No castings recorded yet.</p>
      )}
    </div>
  )
}
