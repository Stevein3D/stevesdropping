'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TitleBadge } from './TitleBadge'
import { Placeholder } from './Placeholder'
import { LightboxImage } from './LightboxImage'

type Episode = {
  castingId: number
  season: number | null
  episodeNumber: number | null
  episodeTitle: string | null
  description: string | null
  releaseDate: string | null
  runtime: number | null
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatEpisodeDate(iso: string | null): { monthDay: string; year: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return {
    monthDay: `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`,
    year: String(d.getUTCFullYear()),
  }
}

type Title = {
  id: number
  name: string
  year: number | null
  endYear: number | null
  description: string | null
  genre: string | null
  titleType: string
  imageUrl: string | null
}

export type CastingRowData = {
  titleId: number
  title: Title
  castingImageUrl: string | null
  hasFilmLevel: boolean
  episodes: Episode[]
}

export function CastingRow({ data }: { data: CastingRowData }) {
  const tg = data
  const seasons = useMemo(() => {
    const set = new Set<number>()
    for (const e of tg.episodes) if (e.season != null) set.add(e.season)
    return Array.from(set).sort((a, b) => a - b)
  }, [tg.episodes])

  type Filter = 'all' | number
  const [filter, setFilter] = useState<Filter>(seasons[0] ?? 'all')
  const [expandedFor, setExpandedFor] = useState<Filter | null>(null)

  const counts = useMemo(() => {
    const m = new Map<number, number>()
    for (const e of tg.episodes) if (e.season != null) m.set(e.season, (m.get(e.season) ?? 0) + 1)
    return m
  }, [tg.episodes])

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? tg.episodes : tg.episodes.filter((e) => e.season === filter)
    return [...filtered].sort((a, b) =>
      (a.season ?? 0) !== (b.season ?? 0)
        ? (a.season ?? 0) - (b.season ?? 0)
        : (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
    )
  }, [tg.episodes, filter])

  const COLLAPSE_THRESHOLD = 8
  const VISIBLE_WHEN_COLLAPSED = 6
  const isExpanded = expandedFor === filter
  const canCollapse = visible.length > COLLAPSE_THRESHOLD
  const displayedEpisodes = canCollapse && !isExpanded
    ? visible.slice(0, VISIBLE_WHEN_COLLAPSED)
    : visible
  const hiddenCount = visible.length - VISIBLE_WHEN_COLLAPSED

  const subLine = tg.title.description ?? null

  const yearText = tg.title.year != null
    ? tg.title.endYear != null && tg.title.endYear !== tg.title.year
      ? `${tg.title.year}–${tg.title.endYear}`
      : String(tg.title.year)
    : ''

  return (
    <div className="border-b border-dotted border-cream-border dark:border-warm-700 py-3 sm:py-3 px-1.5">
      {/* Header row: poster | year (desktop) | title + inline badge + sub */}
      <div className="grid grid-cols-[48px_1fr] sm:grid-cols-[48px_56px_1fr] gap-3 items-start">
        {/* Poster */}
        <Link
          href={`/titles/${tg.titleId}`}
          className="block w-12 shrink-0 hover:opacity-90 transition-opacity"
        >
          {tg.title.imageUrl ? (
            <LightboxImage
              src={tg.title.imageUrl}
              alt={tg.title.name}
              sizes="48px"
              containerClassName="aspect-[2/3] rounded-sm overflow-hidden relative bg-warm-100 dark:bg-warm-700"
            />
          ) : (
            <Placeholder name={tg.title.name} variant="poster" className="rounded-sm" />
          )}
        </Link>

        {/* Year (desktop only) */}
        <span className="hidden sm:inline font-serif font-bold italic text-[13px] text-warm-600 dark:text-warm-500 tabular-nums pt-1 whitespace-nowrap">
          {yearText}
        </span>

        {/* Title + inline badge + sub */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/titles/${tg.titleId}`}
              className="font-serif font-bold text-[15px] sm:text-[16px] text-warm-900 dark:text-warm-200 hover:text-steve transition-colors"
            >
              {tg.title.name}
            </Link>
            <TitleBadge type={tg.title.titleType} />
            <span className="sm:hidden font-serif font-bold italic text-[13px] text-warm-600 dark:text-warm-500 tabular-nums">
              {yearText}
            </span>
          </div>
          {subLine && (
            <span className="block mt-1 text-[13px] text-warm-600 dark:text-warm-500 font-sans font-normal leading-[1.45]">
              {subLine}
            </span>
          )}
        </div>
      </div>

      {/* Episodes — full width below the header line */}
      {tg.episodes.length > 0 && (
        <div className="mt-3">
          {seasons.length > 1 && (
            <div className="inline-flex bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-full p-[3px] text-[11px] mb-2 max-w-full overflow-x-auto overflow-y-hidden no-scrollbar">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-steve text-cream'
                    : 'text-warm-600 dark:text-warm-500 hover:text-warm-900 dark:hover:text-warm-200'
                }`}
                style={{ letterSpacing: '0.05em' }}
              >
                All ({tg.episodes.length})
              </button>
              {seasons.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap ${
                    filter === s
                      ? 'bg-steve text-cream'
                      : 'text-warm-600 dark:text-warm-500 hover:text-warm-900 dark:hover:text-warm-200'
                  }`}
                  style={{ letterSpacing: '0.05em' }}
                >
                  S{s} ({counts.get(s)})
                </button>
              ))}
            </div>
          )}
          <div className="relative pb-3">
          <div className="rounded-md overflow-hidden border border-cream-subtle dark:border-warm-700">
            {displayedEpisodes.map((e, i) => {
              const epNum = e.episodeNumber != null ? String(e.episodeNumber).padStart(2, '0') : '--'
              const dateInfo = formatEpisodeDate(e.releaseDate)
              return (
                <div
                  key={e.castingId}
                  className={`grid grid-cols-[64px_1fr_auto] sm:grid-cols-[72px_1fr_auto] gap-3 sm:gap-[18px] px-3 py-3 sm:px-4 sm:py-3.5 items-start ${
                    i % 2 === 0
                      ? 'bg-cream-card dark:bg-warm-50/[0.04]'
                      : 'bg-cream-subtle/30 dark:bg-warm-700/60'
                  }`}
                >
                  <div className="leading-none">
                    <div className="flex items-baseline gap-1.5">
                      {e.season != null && (
                        <span className="text-[14px] text-warm-600 dark:text-warm-500 font-semibold uppercase leading-none">
                          S{e.season}
                        </span>
                      )}
                      <span className="font-display italic text-steve text-[22px] leading-none">{epNum}</span>
                    </div>
                    {dateInfo && (
                      <div
                        className="mt-2 text-[10px] uppercase text-warm-600 dark:text-warm-500 font-semibold leading-tight"
                        style={{ letterSpacing: '0.12em' }}
                      >
                        <div>{dateInfo.monthDay}</div>
                        <div>{dateInfo.year}</div>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-warm-900 dark:text-warm-200 text-[15px] sm:text-[16px]">
                      {e.episodeTitle ?? 'Untitled'}
                    </p>
                    {e.description && (
                      <p className="text-[13px] text-warm-600 dark:text-warm-500 mt-1 leading-[1.45]">{e.description}</p>
                    )}
                  </div>
                  {e.runtime != null && (
                    <span className="text-[11px] text-warm-600 dark:text-warm-500 tracking-[0.04em] whitespace-nowrap pt-1">{e.runtime} min</span>
                  )}
                </div>
              )
            })}
          </div>
          {canCollapse && (
            <div className="flex justify-center -mt-3">
              <button
                onClick={() => setExpandedFor(isExpanded ? null : filter)}
                className="bg-cream-card dark:bg-warm-700 border border-cream-subtle dark:border-warm-700 rounded-full px-4 py-1 text-[10px] uppercase font-semibold tracking-[0.12em] text-warm-600 dark:text-warm-500 hover:text-steve dark:hover:text-steve transition-colors"
              >
                {isExpanded ? 'Show fewer' : `Show ${hiddenCount} more`}
              </button>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
