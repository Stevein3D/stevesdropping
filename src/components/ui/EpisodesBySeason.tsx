'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Placeholder } from './Placeholder'

type EpisodeCasting = {
  id: number
  personId: number
  characterId: number
  person: { name: string; imageUrl: string | null }
  character: { name: string }
}

export type EpisodeForList = {
  id: number
  season: number | null
  episodeNumber: number | null
  episodeTitle: string | null
  description: string | null
  releaseDate: string | null
  runtime: number | null
  castings: EpisodeCasting[]
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

export function EpisodesBySeason({ episodes }: { episodes: EpisodeForList[] }) {
  const seasons = useMemo(() => {
    const set = new Set<number>()
    for (const e of episodes) if (e.season != null) set.add(e.season)
    return Array.from(set).sort((a, b) => a - b)
  }, [episodes])

  type Active = 'all' | number
  const [active, setActive] = useState<Active>(seasons[0] ?? 'all')

  const counts = useMemo(() => {
    const m = new Map<number, number>()
    for (const e of episodes) if (e.season != null) m.set(e.season, (m.get(e.season) ?? 0) + 1)
    return m
  }, [episodes])

  const visible = useMemo(
    () => {
      const filtered = active === 'all' ? episodes : episodes.filter((e) => e.season === active)
      return [...filtered].sort((a, b) =>
        (a.season ?? 0) !== (b.season ?? 0)
          ? (a.season ?? 0) - (b.season ?? 0)
          : (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
      )
    },
    [episodes, active]
  )

  if (seasons.length === 0) {
    return (
      <div className="rounded-md overflow-hidden border border-cream-subtle dark:border-warm-700">
        {episodes.map((ep, i) => (
          <EpisodeRow key={ep.id} ep={ep} index={i} />
        ))}
      </div>
    )
  }

  return (
    <div>
      {seasons.length > 1 && (
        <div className="flex gap-0.5 border-b border-cream-border dark:border-warm-700 mb-4 overflow-x-auto overflow-y-hidden no-scrollbar">
          <button
            onClick={() => setActive('all')}
            className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.04em] uppercase border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active === 'all'
                ? 'text-steve border-b-steve'
                : 'text-warm-600 dark:text-warm-500 border-transparent hover:text-warm-900 dark:hover:text-warm-200'
            }`}
          >
            All
            <span className="text-[10px] text-warm-600 dark:text-warm-500 ml-1.5">({episodes.length})</span>
          </button>
          {seasons.map((s) => {
            const isActive = s === active
            return (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`px-3.5 py-2.5 text-xs font-semibold tracking-[0.04em] uppercase border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-steve border-b-steve'
                    : 'text-warm-600 dark:text-warm-500 border-transparent hover:text-warm-900 dark:hover:text-warm-200'
                }`}
              >
                Season {s}
                <span className="text-[10px] text-warm-600 dark:text-warm-500 ml-1.5">({counts.get(s)})</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="rounded-md overflow-hidden border border-cream-subtle dark:border-warm-700">
        {visible.map((ep, i) => (
          <EpisodeRow key={ep.id} ep={ep} index={i} />
        ))}
      </div>
    </div>
  )
}

export function EpisodeRow({ ep, index }: { ep: EpisodeForList; index: number }) {
  const epNum = ep.episodeNumber != null ? String(ep.episodeNumber).padStart(2, '0') : '--'
  const dateInfo = formatEpisodeDate(ep.releaseDate)
  return (
    <div
      className={`grid grid-cols-[64px_1fr_auto] sm:grid-cols-[72px_1fr_auto] gap-3 sm:gap-[18px] px-3 py-3 sm:px-4 sm:py-3.5 items-start ${
        index % 2 === 0
          ? 'bg-cream-card dark:bg-warm-50/[0.04]'
          : 'bg-transparent'
      }`}
    >
      <div className="leading-none">
        <div className="flex items-baseline gap-1.5">
          {ep.season != null && (
            <span className="text-[14px] text-warm-600 dark:text-warm-500 font-semibold uppercase leading-none">
              S{ep.season}
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
          {ep.episodeTitle ?? 'Untitled'}
        </p>
        {ep.description && (
          <p className="text-[13px] text-warm-600 dark:text-warm-500 mt-1 leading-[1.45]">{ep.description}</p>
        )}
        {ep.castings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {ep.castings.map((c) => (
              <span
                key={c.id}
                className={`inline-flex items-center gap-1.5 text-[11px] border border-cream-subtle dark:border-warm-700 pl-1 pr-2.5 py-0.5 rounded-full text-warm-600 dark:text-warm-500 ${
                  index % 2 === 0
                    ? 'bg-cream dark:bg-warm-700'
                    : 'bg-cream-card dark:bg-warm-50/[0.12]'
                }`}
              >
                <span className="w-[18px] h-[18px] rounded-full overflow-hidden relative shrink-0 bg-warm-100 dark:bg-warm-700">
                  {c.person.imageUrl ? (
                    <Image
                      src={c.person.imageUrl}
                      alt={c.person.name}
                      fill
                      className="object-cover"
                      sizes="18px"
                    />
                  ) : (
                    <Placeholder name={c.person.name} variant="avatar" />
                  )}
                </span>
                <Link href={`/people/${c.personId}`} className="text-warm-900 dark:text-warm-200 font-medium hover:text-steve transition-colors">
                  {c.person.name}
                </Link>
                <span className="text-warm-600 dark:text-warm-500 mx-1">as</span>
                <Link href={`/characters/${c.characterId}`} className="text-steve font-medium hover:text-steve-hover transition-colors">
                  {c.character.name}
                </Link>
              </span>
            ))}
          </div>
        )}
      </div>
      {ep.runtime != null && (
        <span className="text-[11px] text-warm-600 tracking-[0.04em] whitespace-nowrap pt-1">{ep.runtime} min</span>
      )}
    </div>
  )
}
