import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cache } from 'react'
import type { Metadata } from 'next'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { BackButton } from '@/components/ui/BackButton'
import { Placeholder } from '@/components/ui/Placeholder'
import { EpisodesBySeason, EpisodeRow, type EpisodeForList } from '@/components/ui/EpisodesBySeason'

export const revalidate = 86400

const TV_TYPES = new Set(['tv_series', 'tv_miniseries', 'animated'])
const SHOWING_TYPES = new Set(['film', 'tv_movie', 'short', 'documentary'])

const TYPE_LABEL: Record<string, string> = {
  film:          'MOTION PICTURE',
  tv_series:     'TELEVISION SERIES',
  tv_miniseries: 'LIMITED SERIES',
  tv_movie:      'TV MOVIE',
  animated:      'ANIMATED',
  short:         'SHORT FILM',
  documentary:   'DOCUMENTARY',
  video:         'VIDEO',
  other:         'ENTRY',
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(d: Date | null): string | null {
  if (!d) return null
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

const getTitle = cache(async (id: number) =>
  prisma.title.findUnique({
    where: { id },
    include: {
      castings: {
        include: { person: true, character: true, episode: true },
      },
      episodes: {
        orderBy: [{ season: 'asc' }, { episodeNumber: 'asc' }],
        include: {
          castings: {
            include: { person: true, character: true },
          },
        },
      },
    },
  })
)

function ogImage(imageUrl: string | null): string | undefined {
  if (!imageUrl) return undefined
  return `${imageUrl.split('?')[0]}?tr=w-1200,h-630,fo-auto,q-85`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const title = await getTitle(parseInt(params.id))
  if (!title) return { title: 'Not Found' }

  const endYear = title.endDate ? title.endDate.getUTCFullYear() : null
  const yearRange = title.year != null
    ? endYear != null ? `${title.year}–${endYear}` : String(title.year)
    : null

  const description = title.description?.slice(0, 200) ||
    `Steve appearances in ${title.name}${yearRange ? ` (${yearRange})` : ''}, cataloged on Stevesdropping.`

  const image = ogImage(title.imageUrl)

  return {
    title: title.name,
    description,
    openGraph: {
      title: `${title.name} — Stevesdropping`,
      description,
      type: 'website',
      url: `/titles/${title.id}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title.name} — Stevesdropping`,
      description,
      images: image ? [image] : undefined,
    },
    alternates: { canonical: `/titles/${title.id}` },
  }
}

export default async function TitlePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { q?: string }
}) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const title = await getTitle(id)
  if (!title) notFound()

  const searchQuery = searchParams?.q?.trim() || ''
  const matchedEpisodes: EpisodeForList[] = searchQuery
    ? title.episodes
        .filter((e) => e.episodeTitle?.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((e) => ({
          id: e.id,
          season: e.season,
          episodeNumber: e.episodeNumber,
          episodeTitle: e.episodeTitle,
          description: e.description,
          releaseDate: e.releaseDate ? e.releaseDate.toISOString() : null,
          runtime: e.runtime,
          castings: e.castings.map((c) => ({
            id: c.id,
            personId: c.personId,
            characterId: c.characterId,
            person: { name: c.person.name, imageUrl: c.person.imageUrl },
            character: { name: c.character.name },
          })),
        }))
    : []

  const titleStartYear = title.year ?? null
  const titleEndYear = title.endDate ? title.endDate.getUTCFullYear() : null
  const yearRange = titleStartYear != null
    ? titleEndYear != null && titleEndYear !== titleStartYear
      ? `${titleStartYear}–${titleEndYear}`
      : String(titleStartYear)
    : null

  // Group castings into unique person+character entries with appearance counts and year spans.
  type CastEntry = {
    key: string
    personId: number
    characterId: number
    person: { name: string; imageUrl: string | null }
    character: { name: string }
    castingImageUrl: string | null
    appearanceCount: number
    yearStart: number | null
    yearEnd: number | null
  }
  const groups = new Map<string, CastEntry>()

  for (const c of title.castings) {
    if (c.episodeId !== null) continue
    const key = `${c.personId}|${c.characterId}`
    const existing = groups.get(key)
    if (existing) {
      existing.appearanceCount += 1
      if (!existing.castingImageUrl && c.imageUrl) existing.castingImageUrl = c.imageUrl
    } else {
      groups.set(key, {
        key,
        personId: c.personId,
        characterId: c.characterId,
        person: c.person,
        character: c.character,
        castingImageUrl: c.imageUrl,
        appearanceCount: 1,
        yearStart: titleStartYear,
        yearEnd: titleEndYear ?? titleStartYear,
      })
    }
  }
  for (const ep of title.episodes) {
    const epYear = ep.releaseDate ? ep.releaseDate.getUTCFullYear() : null
    for (const c of ep.castings) {
      const key = `${c.personId}|${c.characterId}`
      const existing = groups.get(key)
      if (existing) {
        existing.appearanceCount += 1
        if (!existing.castingImageUrl && c.imageUrl) existing.castingImageUrl = c.imageUrl
        if (epYear != null) {
          existing.yearStart = existing.yearStart == null ? epYear : Math.min(existing.yearStart, epYear)
          existing.yearEnd   = existing.yearEnd   == null ? epYear : Math.max(existing.yearEnd,   epYear)
        }
      } else {
        groups.set(key, {
          key,
          personId: c.personId,
          characterId: c.characterId,
          person: c.person,
          character: c.character,
          castingImageUrl: c.imageUrl,
          appearanceCount: 1,
          yearStart: epYear,
          yearEnd: epYear,
        })
      }
    }
  }
  const cast = Array.from(groups.values())

  // Marquee bar text
  const status = TV_TYPES.has(title.titleType) ? 'ON AIR'
    : SHOWING_TYPES.has(title.titleType) ? 'NOW SHOWING'
    : 'FEATURED'
  const typeLabelBig = TYPE_LABEL[title.titleType] ?? 'ENTRY'

  // Kicker
  let kicker = ''
  if (TV_TYPES.has(title.titleType)) {
    if (title.year != null) {
      kicker = titleEndYear != null
        ? `Originally broadcast · ${title.year}–${titleEndYear}`
        : `Broadcasting since ${title.year}`
    } else {
      kicker = TYPE_LABEL[title.titleType]
    }
  } else if (SHOWING_TYPES.has(title.titleType)) {
    const dateStr = formatDate(title.releaseDate) ?? (title.year != null ? String(title.year) : null)
    kicker = dateStr ? `${typeLabelBig} · ${dateStr}` : typeLabelBig
  } else {
    kicker = title.year != null ? `${typeLabelBig} · ${title.year}` : typeLabelBig
  }

  // Stats — adaptive 4-cell strip
  const seasonsCount = new Set(
    title.episodes.map((e) => e.season).filter((s): s is number => s != null)
  ).size

  const distinctSteves = new Set(cast.map((c) => c.characterId)).size

  type Stat = { value: string; label: string }
  const stats: Stat[] = [{ value: String(distinctSteves), label: distinctSteves === 1 ? 'Steve' : 'Steves' }]
  if (title.episodes.length > 0) {
    stats.push({ value: String(title.episodes.length), label: title.episodes.length === 1 ? 'Episode' : 'Episodes' })
  } else if (title.runtime != null) {
    stats.push({ value: String(title.runtime), label: 'Runtime · min' })
  }
  if (seasonsCount > 1) {
    stats.push({ value: String(seasonsCount), label: 'Seasons' })
  } else if (title.genre) {
    stats.push({ value: title.genre.split(',')[0].trim(), label: 'Genre' })
  }
  const hasMultiYear = titleEndYear != null && titleStartYear != null && titleEndYear !== titleStartYear
  if (hasMultiYear) {
    stats.push({ value: `${titleStartYear}–${titleEndYear}`, label: 'Span' })
  } else {
    const released = formatDate(title.releaseDate) ?? (titleStartYear != null ? String(titleStartYear) : null)
    if (released) stats.push({ value: released, label: 'Released' })
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': TV_TYPES.has(title.titleType) ? 'TVSeries' : 'Movie',
    name: title.name,
    description: title.description ?? undefined,
    image: title.imageUrl ?? undefined,
    url: `https://stevesdropping.com/titles/${title.id}`,
    datePublished: title.releaseDate?.toISOString().slice(0, 10)
      ?? (title.year ? `${title.year}-01-01` : undefined),
    genre: title.genre ?? undefined,
    actor: cast.map((c) => ({
      '@type': 'Person',
      name: c.person.name,
      url: `https://stevesdropping.com/people/${c.personId}`,
    })),
  }

  return (
    <div className="space-y-8 sm:space-y-10 -mt-6 sm:-mt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton />

      {/* Marquee Hero */}
      <article className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg overflow-hidden">
        {/* Top bar */}
        <div
          className="bg-steve text-cream flex items-center px-4 py-2 font-mono font-semibold uppercase text-[10px] sm:text-[11px]"
          style={{ letterSpacing: '0.18em' }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span aria-hidden>◉</span>
            <span>{status}</span>
            <span className="opacity-70">·</span>
            <span className="truncate">{typeLabelBig}</span>
          </span>
        </div>

        {/* Body */}
        <div className="p-5 sm:px-[30px] sm:pt-[26px] sm:pb-[30px] grid gap-5 sm:gap-7 sm:grid-cols-[200px_1fr]">
          {/* Poster */}
          <div className="w-32 sm:w-[200px]">
            {title.imageUrl ? (
              <div className="aspect-[2/3] relative rounded-md overflow-hidden">
                <Image
                  src={title.imageUrl}
                  alt={title.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 128px, 200px"
                  priority
                />
              </div>
            ) : (
              <Placeholder name={title.name} variant="poster" />
            )}
          </div>

          {/* Right column */}
          <div className="min-w-0">
            {kicker && (
              <p
                className="text-steve uppercase font-semibold text-[11px]"
                style={{ letterSpacing: '0.18em' }}
              >
                {kicker}
              </p>
            )}
            <h1
              className="font-serif font-black text-warm-900 dark:text-warm-200 mt-1.5"
              style={{ fontSize: 'clamp(36px, 8vw, 60px)', lineHeight: 0.95, letterSpacing: '-0.02em' }}
            >
              {title.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-warm-600 dark:text-warm-500">
              <TitleBadge type={title.titleType} />
              {yearRange && <span className="tabular-nums">{yearRange}</span>}
              {title.genre && (
                <>
                  <span className="text-warm-600" aria-hidden>·</span>
                  <span>{title.genre}</span>
                </>
              )}
              {title.runtime != null && (
                <>
                  <span className="text-warm-600" aria-hidden>·</span>
                  <span>{title.runtime} min</span>
                </>
              )}
            </div>
            {title.description && (
              <p className="text-[14px] text-warm-600 dark:text-warm-500 mt-3 leading-[1.55] max-w-[60ch]">
                {title.description}
              </p>
            )}
          </div>
        </div>

      </article>

      {/* Stat strip */}
      {stats.length > 0 && (
        <section className="border border-cream-border dark:border-warm-700 rounded-md bg-cream-card dark:bg-warm-50/5 grid grid-cols-2 sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`p-3 sm:px-4 sm:py-[14px] ${
                i % 2 === 1 ? 'border-l border-cream-subtle dark:border-warm-700' : ''
              } ${i >= 2 ? 'border-t sm:border-t-0 sm:border-l border-cream-subtle dark:border-warm-700' : ''}`}
            >
              <div
                className="font-display text-[22px] sm:text-[26px] text-steve leading-none truncate"
                style={{ letterSpacing: '-0.01em' }}
              >
                {s.value}
              </div>
              <div
                className="text-[10px] uppercase text-warm-600 dark:text-warm-500 mt-1.5 font-semibold"
                style={{ letterSpacing: '0.15em' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Matched episodes (only when arriving from a search) */}
      {matchedEpisodes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-x-3 gap-y-1">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
              Matched Episodes
            </h2>
            <span className="text-xs text-warm-600 dark:text-warm-500">
              {matchedEpisodes.length} match{matchedEpisodes.length === 1 ? '' : 'es'} for &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
          <div className="rounded-md overflow-hidden border border-cream-subtle dark:border-warm-700">
            {matchedEpisodes.map((ep, i) => (
              <EpisodeRow key={ep.id} ep={ep} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Cast grid */}
      {cast.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">The Steve Cast</h2>
            <span className="text-xs text-warm-600 dark:text-warm-500">{cast.length} listed</span>
          </div>
          <div
            className="grid gap-3.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
          >
            {cast.map((c) => {
              const yearText = c.yearStart != null
                ? c.yearEnd != null && c.yearEnd !== c.yearStart
                  ? `${c.yearStart}–${c.yearEnd}`
                  : String(c.yearStart)
                : ''
              return (
                <Link
                  key={c.key}
                  href={`/people/${c.personId}`}
                  className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-md p-2.5 flex flex-col gap-2 hover:border-steve dark:hover:border-warm-200 hover:-translate-y-0.5 transition"
                >
                  <div
                    className="bg-steve text-cream rounded-sm py-1 px-2 text-center text-[10px] font-semibold uppercase truncate"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    {c.character.name}
                  </div>
                  {c.castingImageUrl ? (
                    <div className="aspect-[3/4] rounded-sm overflow-hidden relative">
                      <Image
                        src={c.castingImageUrl}
                        alt={`${c.person.name} as ${c.character.name}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 45vw, 150px"
                      />
                    </div>
                  ) : c.person.imageUrl ? (
                    <div className="aspect-[3/4] rounded-sm overflow-hidden relative">
                      <Image
                        src={c.person.imageUrl}
                        alt={c.person.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 45vw, 150px"
                      />
                    </div>
                  ) : (
                    <Placeholder name={c.person.name} variant="portrait" className="rounded-sm" />
                  )}
                  <div className="font-serif font-bold text-[14px] text-center text-warm-900 dark:text-warm-200 leading-tight">
                    {c.person.name}
                  </div>
                  <div className="text-[11px] text-warm-500 dark:text-warm-500 text-center">
                    as <span className="text-steve font-medium">{c.character.name}</span>
                  </div>
                  <div
                    className="flex justify-between border-t border-dotted border-cream-border dark:border-warm-700 pt-1.5 text-[9px] uppercase text-warm-600 dark:text-warm-500 tabular-nums"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    <span>{yearText}</span>
                    <span title={`${c.appearanceCount} appearance${c.appearanceCount === 1 ? '' : 's'}`}>
                      ({c.appearanceCount} EP)
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Episodes */}
      {title.episodes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
            <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
              Episodes with Steves
            </h2>
          </div>
          <EpisodesBySeason
            episodes={title.episodes.map((e) => ({
              id: e.id,
              season: e.season,
              episodeNumber: e.episodeNumber,
              episodeTitle: e.episodeTitle,
              description: e.description,
              releaseDate: e.releaseDate ? e.releaseDate.toISOString() : null,
              runtime: e.runtime,
              castings: e.castings.map((c) => ({
                id: c.id,
                personId: c.personId,
                characterId: c.characterId,
                person: { name: c.person.name, imageUrl: c.person.imageUrl },
                character: { name: c.character.name },
              })),
            }))}
          />
        </section>
      )}

      {cast.length === 0 && title.episodes.length === 0 && (
        <p className="text-warm-600 dark:text-warm-500 text-sm">No Steve appearances recorded yet.</p>
      )}
    </div>
  )
}
