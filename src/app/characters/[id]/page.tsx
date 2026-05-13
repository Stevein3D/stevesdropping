import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cache } from 'react'
import type { Metadata } from 'next'
import { BackButton } from '@/components/ui/BackButton'
import { Placeholder } from '@/components/ui/Placeholder'
import { CastingRow, type CastingRowData } from '@/components/ui/CastingRow'

export const revalidate = 86400

const CHARACTER_TYPE_LABEL: Record<string, string> = {
  protagonist: 'Protagonist',
  supporting:  'Supporting',
  antagonist:  'Antagonist',
  cameo:       'Cameo',
  other:       'Other',
}

const getCharacter = cache(async (id: number) =>
  prisma.character.findUnique({
    where: { id },
    include: {
      castings: {
        include: { person: true, title: true, episode: true },
      },
    },
  })
)

function ogImage(imageUrl: string | null): string | undefined {
  if (!imageUrl) return undefined
  return `${imageUrl.split('?')[0]}?tr=w-1200,h-630,fo-auto,q-85`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const character = await getCharacter(parseInt(params.id))
  if (!character) return { title: 'Not Found' }

  const actorCount = new Set(character.castings.map((c) => c.personId)).size
  const description = character.description?.slice(0, 200) ||
    `${character.name}: cataloged Steve character with ${actorCount} actor${actorCount === 1 ? '' : 's'} across film and television.`

  const image = ogImage(character.imageUrl)

  return {
    title: character.name,
    description,
    openGraph: {
      title: `${character.name} — Stevesdropping`,
      description,
      type: 'website',
      url: `/characters/${character.id}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${character.name} — Stevesdropping`,
      description,
      images: image ? [image] : undefined,
    },
    alternates: { canonical: `/characters/${character.id}` },
  }
}

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const character = await getCharacter(id)
  if (!character) notFound()

  // Group castings by person → title.
  type EpisodeEntry = {
    castingId: number
    season: number | null
    episodeNumber: number | null
    episodeTitle: string | null
    description: string | null
    releaseDate: string | null
    runtime: number | null
  }
  type TitleGroup = {
    titleId: number
    title: (typeof character.castings)[0]['title']
    castingImageUrl: string | null
    hasFilmLevel: boolean
    episodes: EpisodeEntry[]
  }
  type PersonGroup = {
    personId: number
    personName: string
    personImageUrl: string | null
    titles: Map<number, TitleGroup>
  }

  const personMap = new Map<number, PersonGroup>()
  for (const c of character.castings) {
    let pg = personMap.get(c.personId)
    if (!pg) {
      pg = {
        personId: c.personId,
        personName: c.person.name,
        personImageUrl: c.person.imageUrl,
        titles: new Map(),
      }
      personMap.set(c.personId, pg)
    }
    let tg = pg.titles.get(c.titleId)
    if (!tg) {
      tg = {
        titleId: c.titleId,
        title: c.title,
        castingImageUrl: c.imageUrl,
        hasFilmLevel: false,
        episodes: [],
      }
      pg.titles.set(c.titleId, tg)
    }
    if (c.episode) {
      tg.episodes.push({
        castingId: c.id,
        season: c.episode.season,
        episodeNumber: c.episode.episodeNumber,
        episodeTitle: c.episode.episodeTitle,
        description: c.episode.description,
        releaseDate: c.episode.releaseDate ? c.episode.releaseDate.toISOString() : null,
        runtime: c.episode.runtime,
      })
    } else {
      tg.hasFilmLevel = true
    }
  }

  // Sort each person's titles by year asc; sort persons by first appearance year asc.
  const persons = Array.from(personMap.values()).map((pg) => {
    const titlesSorted = Array.from(pg.titles.values()).sort((a, b) => {
      const aV = a.title.releaseDate ? a.title.releaseDate.getTime() : (a.title.year ?? 0) * 1e9
      const bV = b.title.releaseDate ? b.title.releaseDate.getTime() : (b.title.year ?? 0) * 1e9
      return aV - bV
    })
    return { ...pg, titlesSorted }
  })
  persons.sort((a, b) => {
    const aY = a.titlesSorted[0]?.title.year ?? 9999
    const bY = b.titlesSorted[0]?.title.year ?? 9999
    return aY - bY
  })

  // Stats
  const distinctTitles = new Set(character.castings.map((c) => c.titleId))
  const distinctPersons = new Set(character.castings.map((c) => c.personId))

  // Span across all titles
  const allYears: number[] = []
  for (const c of character.castings) {
    if (c.title.year != null) allYears.push(c.title.year)
    if (c.title.endDate) allYears.push(c.title.endDate.getUTCFullYear())
  }
  const spanText = allYears.length > 0
    ? Math.min(...allYears) === Math.max(...allYears)
      ? String(Math.min(...allYears))
      : `${Math.min(...allYears)}–${Math.max(...allYears)}`
    : null

  // Chip count: appearances (episodes if any, otherwise 1 per feature title)
  const chipCount = (pg: typeof persons[0]) => {
    let n = 0
    for (const tg of pg.titlesSorted) {
      if (tg.episodes.length === 0) n += 1
      else n += tg.episodes.length
    }
    return n
  }

  const kicker = (CHARACTER_TYPE_LABEL[character.characterType] ?? character.characterType).toUpperCase()

  const truncatedDescription = character.description
    ? character.description.length > 280 ? character.description.slice(0, 280).trim() + '…' : character.description
    : null

  return (
    <div className="space-y-8 sm:space-y-10">
      <BackButton />

      {/* Banner */}
      <article className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg p-5 sm:p-[22px]">
        <div className="grid gap-5 sm:gap-6 grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr_auto] items-start sm:items-center">
          {/* Image */}
          <div className="w-[100px] sm:w-[120px]">
            {character.imageUrl ? (
              <div className="aspect-[3/4] rounded-md overflow-hidden relative">
                <Image
                  src={character.imageUrl}
                  alt={character.name}
                  fill
                  className="object-cover"
                  sizes="120px"
                  priority
                />
              </div>
            ) : (
              <Placeholder name={character.name} variant="portrait" />
            )}
          </div>

          {/* Middle */}
          <div className="min-w-0">
            <p
              className="text-steve uppercase font-semibold text-[11px]"
              style={{ letterSpacing: '0.18em' }}
            >
              {kicker}
            </p>
            <h1
              className="font-serif font-black text-warm-900 dark:text-warm-200 mt-1.5 mb-2"
              style={{ fontSize: 'clamp(28px, 6.5vw, 44px)', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {character.name}
            </h1>
            {truncatedDescription && (
              <p className="text-[13px] text-warm-500 dark:text-warm-500 leading-[1.5] max-w-[60ch]">
                {truncatedDescription}
              </p>
            )}
          </div>

          {/* Stats — horizontal in both modes; under content on mobile, right column on desktop */}
          <div className="col-span-2 sm:col-span-1 flex gap-[18px] pt-3 sm:pt-0 border-t sm:border-t-0 border-cream-subtle dark:border-warm-700">
            <Stat value={character.castings.length} label="Appearances" />
            <Stat value={distinctPersons.size} label="Actors" />
            <Stat value={distinctTitles.size} label="Titles" />
          </div>
        </div>
      </article>

      {/* Cast (actors who have played this character) */}
      {persons.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
              Cast
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {persons.map((pg) => (
              <Link
                key={pg.personId}
                href={`/people/${pg.personId}`}
                className="inline-flex items-center gap-1.5 bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-full pl-1 pr-3 py-[5px] text-[12px] hover:border-steve dark:hover:border-warm-200 transition-colors"
              >
                <span className="w-[22px] h-[22px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
                  {pg.personImageUrl ? (
                    <Image
                      src={pg.personImageUrl}
                      alt={pg.personName}
                      fill
                      className="object-cover"
                      sizes="22px"
                    />
                  ) : (
                    <Placeholder name={pg.personName} variant="avatar" />
                  )}
                </span>
                <span className="font-serif font-bold text-steve">{pg.personName}</span>
                <span className="bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-1.5 py-px rounded-full text-[10px] font-mono">
                  {chipCount(pg)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filmography */}
      {persons.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
              Filmography
            </h2>
            <span className="text-xs text-warm-600 dark:text-warm-500">
              {distinctTitles.size} title{distinctTitles.size === 1 ? '' : 's'} · {character.castings.length} appearance{character.castings.length === 1 ? '' : 's'}
              {spanText ? ` · ${spanText}` : ''}
            </span>
          </div>

          {persons.map((pg) => (
            <div key={pg.personId} className="space-y-0">
              {/* Actor heading */}
              <div className="flex items-center gap-2.5 pt-2 pb-2">
                <span className="w-[30px] h-[30px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
                  {pg.personImageUrl ? (
                    <Image
                      src={pg.personImageUrl}
                      alt={pg.personName}
                      fill
                      className="object-cover"
                      sizes="30px"
                    />
                  ) : (
                    <Placeholder name={pg.personName} variant="avatar" />
                  )}
                </span>
                <Link
                  href={`/people/${pg.personId}`}
                  className="font-serif font-black text-[18px] text-steve hover:text-steve-hover transition-colors"
                >
                  {pg.personName}
                </Link>
              </div>

              {/* Rows */}
              <div>
                {pg.titlesSorted.map((tg) => {
                  const data: CastingRowData = {
                    titleId: tg.titleId,
                    title: {
                      id: tg.title.id,
                      name: tg.title.name,
                      year: tg.title.year,
                      description: tg.title.description,
                      genre: tg.title.genre,
                      titleType: tg.title.titleType,
                    },
                    castingImageUrl: tg.castingImageUrl,
                    hasFilmLevel: tg.hasFilmLevel,
                    episodes: tg.episodes,
                  }
                  return <CastingRow key={tg.titleId} data={data} />
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {persons.length === 0 && (
        <p className="text-warm-500 dark:text-warm-500 text-sm">No castings recorded yet.</p>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div
        className="font-display text-[26px] text-steve leading-none"
        style={{ letterSpacing: '-0.01em' }}
      >
        {value}
      </div>
      <div
        className="text-[9px] uppercase text-warm-600 dark:text-warm-500 mt-1 font-semibold"
        style={{ letterSpacing: '0.18em' }}
      >
        {label}
      </div>
    </div>
  )
}
