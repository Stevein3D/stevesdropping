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

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatFullDate(d: Date | null): string | null {
  if (!d) return null
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

const PERSON_TYPE_LABEL: Record<string, string> = {
  actor:      'Actor',
  artist:     'Artist',
  author:     'Author',
  celebrity:  'Celebrity',
  comedian:   'Comedian',
  composer:   'Composer',
  director:   'Director',
  filmmaker:  'Filmmaker',
  inventor:   'Inventor',
  musician:   'Musician',
  athlete:    'Athlete',
  writer:     'Writer',
  other:      'Other',
}

const getPerson = cache(async (id: number) =>
  prisma.person.findUnique({
    where: { id },
    include: {
      castings: {
        include: { character: true, title: true, episode: true },
      },
    },
  })
)

function ogImage(imageUrl: string | null): string | undefined {
  if (!imageUrl) return undefined
  return `${imageUrl.split('?')[0]}?tr=w-1200,h-630,fo-auto,q-85`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const person = await getPerson(parseInt(params.id))
  if (!person) return { title: 'Not Found' }

  const count = person.castings.length
  const description = person.bio?.slice(0, 200) ||
    `${person.name}: ${count} cataloged Steve appearance${count === 1 ? '' : 's'} across film and television.`

  const image = ogImage(person.imageUrl)

  return {
    title: person.name,
    description,
    openGraph: {
      title: `${person.name} — Stevesdropping`,
      description,
      type: 'profile',
      url: `/people/${person.id}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${person.name} — Stevesdropping`,
      description,
      images: image ? [image] : undefined,
    },
    alternates: { canonical: `/people/${person.id}` },
  }
}

export default async function PersonPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const person = await getPerson(id)
  if (!person) notFound()

  // Group castings by character → title (preserving original logic).
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
    title: (typeof person.castings)[0]['title']
    castingImageUrl: string | null
    hasFilmLevel: boolean
    episodes: EpisodeEntry[]
  }
  type CharGroup = {
    characterId: number
    characterName: string
    characterImageUrl: string | null
    titles: Map<number, TitleGroup>
  }

  const charMap = new Map<number, CharGroup>()
  for (const c of person.castings) {
    let cg = charMap.get(c.characterId)
    if (!cg) {
      cg = {
        characterId: c.characterId,
        characterName: c.character.name,
        characterImageUrl: c.character.imageUrl,
        titles: new Map(),
      }
      charMap.set(c.characterId, cg)
    }
    let tg = cg.titles.get(c.titleId)
    if (!tg) {
      tg = {
        titleId: c.titleId,
        title: c.title,
        castingImageUrl: c.imageUrl,
        hasFilmLevel: false,
        episodes: [],
      }
      cg.titles.set(c.titleId, tg)
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

  // Sort each character's titles by year asc; sort characters by first appearance year asc.
  const characters = Array.from(charMap.values()).map((cg) => {
    const titlesSorted = Array.from(cg.titles.values()).sort((a, b) => {
      const aV = a.title.releaseDate ? a.title.releaseDate.getTime() : (a.title.year ?? 0) * 1e9
      const bV = b.title.releaseDate ? b.title.releaseDate.getTime() : (b.title.year ?? 0) * 1e9
      return aV - bV
    })
    return { ...cg, titlesSorted }
  })
  characters.sort((a, b) => {
    const aY = a.titlesSorted[0]?.title.year ?? 9999
    const bY = b.titlesSorted[0]?.title.year ?? 9999
    return aY - bY
  })

  // Stats
  const distinctTitles = new Set(person.castings.map((c) => c.titleId))
  const distinctCharacters = new Set(person.castings.map((c) => c.characterId))

  // Span across all titles
  const allYears: number[] = []
  for (const c of person.castings) {
    if (c.title.year != null) allYears.push(c.title.year)
    if (c.title.endDate) allYears.push(c.title.endDate.getUTCFullYear())
  }
  const spanText = allYears.length > 0
    ? Math.min(...allYears) === Math.max(...allYears)
      ? String(Math.min(...allYears))
      : `${Math.min(...allYears)}–${Math.max(...allYears)}`
    : null

  // For each character chip: count of "appearances" (sum of episodes; 1 per feature).
  const chipCount = (cg: typeof characters[0]) => {
    let n = 0
    for (const tg of cg.titlesSorted) {
      if (tg.episodes.length === 0) n += 1
      else n += tg.episodes.length
    }
    return n
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.bio ?? undefined,
    image: person.imageUrl ?? undefined,
    url: `https://stevesdropping.com/people/${person.id}`,
    birthDate: person.birthDate?.toISOString().slice(0, 10)
      ?? (person.birthYear ? `${person.birthYear}-01-01` : undefined),
    deathDate: person.deathDate?.toISOString().slice(0, 10)
      ?? (person.deathYear ? `${person.deathYear}-01-01` : undefined),
    nationality: person.nationality ?? undefined,
    jobTitle: person.personType,
  }

  // Banner kicker: PERSON_TYPE · b. {birthYear} – d. {deathYear} · {birthplace}
  const kickerParts: string[] = []
  kickerParts.push((PERSON_TYPE_LABEL[person.personType] ?? person.personType).toUpperCase())
  const lifeDates: string[] = []
  const birthText = formatFullDate(person.birthDate) ?? (person.birthYear ? String(person.birthYear) : null)
  const deathText = formatFullDate(person.deathDate) ?? (person.deathYear ? String(person.deathYear) : null)
  if (birthText) lifeDates.push(`b. ${birthText}`)
  if (deathText) lifeDates.push(`d. ${deathText}`)
  if (lifeDates.length > 0) kickerParts.push(lifeDates.join(' – '))
  if (person.birthplace) kickerParts.push(person.birthplace)
  const kicker = kickerParts.join(' · ')

  const truncatedBio = person.bio
    ? person.bio.length > 280 ? person.bio.slice(0, 280).trim() + '…' : person.bio
    : null

  return (
    <div className="space-y-8 sm:space-y-10">
      <BackButton />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Banner */}
      <article className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg p-5 sm:p-[22px]">
        <div className="grid gap-5 sm:gap-6 grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr_auto] items-start sm:items-center">
          {/* Portrait */}
          <div className="w-[100px] sm:w-[120px]">
            {person.imageUrl ? (
              <div className="aspect-[3/4] rounded-md overflow-hidden relative">
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  fill
                  className="object-cover"
                  sizes="120px"
                  priority
                />
              </div>
            ) : (
              <Placeholder name={person.name} variant="portrait" />
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
              {person.name}
            </h1>
            {truncatedBio && (
              <p className="text-[13px] text-warm-500 dark:text-warm-500 leading-[1.5] max-w-[60ch]">
                {truncatedBio}
              </p>
            )}
          </div>

          {/* Stats — horizontal in both modes; under content on mobile, right column on desktop */}
          <div className="col-span-2 sm:col-span-1 flex gap-[18px] pt-3 sm:pt-0 border-t sm:border-t-0 border-cream-subtle dark:border-warm-700">
            <Stat value={person.castings.length} label={person.castings.length === 1 ? 'Appearance' : 'Appearances'} />
            <Stat value={distinctCharacters.size} label={distinctCharacters.size === 1 ? 'Steve' : 'Steves'} />
            <Stat value={distinctTitles.size} label={distinctTitles.size === 1 ? 'Title' : 'Titles'} />
          </div>
        </div>
      </article>

      {/* Roles */}
      {characters.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
              Roles
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {characters.map((cg) => (
              <Link
                key={cg.characterId}
                href={`/characters/${cg.characterId}`}
                className="inline-flex items-center gap-1.5 bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-full pl-1 pr-3 py-[5px] text-[12px] hover:border-steve dark:hover:border-warm-200 transition-colors"
              >
                <span className="w-[22px] h-[22px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
                  {cg.characterImageUrl ? (
                    <Image
                      src={cg.characterImageUrl}
                      alt={cg.characterName}
                      fill
                      className="object-cover"
                      sizes="22px"
                    />
                  ) : (
                    <Placeholder name={cg.characterName} variant="avatar" />
                  )}
                </span>
                <span className="font-serif font-bold text-steve">{cg.characterName}</span>
                <span className="bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-1.5 py-px rounded-full text-[10px] font-mono">
                  {chipCount(cg)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filmography */}
      {characters.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
              Filmography
            </h2>
            <span className="text-xs text-warm-600 dark:text-warm-500">
              {distinctTitles.size} title{distinctTitles.size === 1 ? '' : 's'} · {person.castings.length} appearance{person.castings.length === 1 ? '' : 's'}
              {spanText ? ` · ${spanText}` : ''}
            </span>
          </div>

          {characters.map((cg) => {
            return (
              <div key={cg.characterId} className="space-y-0">
                {/* Character heading */}
                <div className="flex items-center gap-2.5 pt-2 pb-2">
                  <span className="w-[30px] h-[30px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
                    {cg.characterImageUrl ? (
                      <Image
                        src={cg.characterImageUrl}
                        alt={cg.characterName}
                        fill
                        className="object-cover"
                        sizes="30px"
                      />
                    ) : (
                      <Placeholder name={cg.characterName} variant="avatar" />
                    )}
                  </span>
                  <Link
                    href={`/characters/${cg.characterId}`}
                    className="font-serif font-black text-[18px] text-steve hover:text-steve-hover transition-colors"
                  >
                    {cg.characterName}
                  </Link>
                </div>

                {/* Rows */}
                <div>
                  {cg.titlesSorted.map((tg) => {
                    const data: CastingRowData = {
                      titleId: tg.titleId,
                      title: {
                        id: tg.title.id,
                        name: tg.title.name,
                        year: tg.title.year,
                        endYear: tg.title.endDate ? tg.title.endDate.getUTCFullYear() : null,
                        description: tg.title.description,
                        genre: tg.title.genre,
                        titleType: tg.title.titleType,
                        imageUrl: tg.title.imageUrl,
                      },
                      castingImageUrl: tg.castingImageUrl,
                      hasFilmLevel: tg.hasFilmLevel,
                      episodes: tg.episodes,
                    }
                    return <CastingRow key={tg.titleId} data={data} />
                  })}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {characters.length === 0 && (
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
        className="text-[9px] uppercase text-warm-500 dark:text-warm-500 mt-1 font-semibold"
        style={{ letterSpacing: '0.18em' }}
      >
        {label}
      </div>
    </div>
  )
}
