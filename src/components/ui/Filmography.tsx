'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CastingRow, type CastingRowData } from './CastingRow'
import { Placeholder } from './Placeholder'
import { TitleBadge } from './TitleBadge'
import { LightboxImage } from './LightboxImage'

export type FilmographyTitle = CastingRowData & { episodeCount: number }

export type FilmographyCharacter = {
  characterId: number
  characterName: string
  characterImageUrl: string | null
  titles: FilmographyTitle[]
}

export type FilmographyStats = {
  distinctTitles: number
  appearances: number
  spanText: string | null
}

export function Filmography({
  characters,
  stats,
  defaultCompact,
}: {
  characters: FilmographyCharacter[]
  stats: FilmographyStats
  defaultCompact: boolean
}) {
  const [compact, setCompact] = useState(defaultCompact)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
            Filmography
          </h2>
          {/* Compact / Full toggle */}
          <div className="inline-flex bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-full p-[3px] text-[11px]">
            <button
              onClick={() => setCompact(true)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                compact
                  ? 'bg-steve text-cream'
                  : 'text-warm-600 dark:text-warm-500 hover:text-warm-900 dark:hover:text-warm-200'
              }`}
              style={{ letterSpacing: '0.05em' }}
            >
              Compact
            </button>
            <button
              onClick={() => setCompact(false)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                !compact
                  ? 'bg-steve text-cream'
                  : 'text-warm-600 dark:text-warm-500 hover:text-warm-900 dark:hover:text-warm-200'
              }`}
              style={{ letterSpacing: '0.05em' }}
            >
              Full
            </button>
          </div>
        </div>
        <span className="text-xs text-warm-600 dark:text-warm-500">
          {stats.distinctTitles} title{stats.distinctTitles === 1 ? '' : 's'} · {stats.appearances} appearance{stats.appearances === 1 ? '' : 's'}
          {stats.spanText ? ` · ${stats.spanText}` : ''}
        </span>
      </div>

      {characters.map((cg) => (
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
          {compact ? (
            <div className="grid sm:grid-cols-2 sm:gap-x-6">
              {cg.titles.map((t) => (
                <CompactTitleRow key={t.titleId} t={t} />
              ))}
            </div>
          ) : (
            <div>
              {cg.titles.map((t) => (
                <CastingRow key={t.titleId} data={t} />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

function CompactTitleRow({ t }: { t: FilmographyTitle }) {
  const yearText = t.title.year != null
    ? t.title.endYear != null && t.title.endYear !== t.title.year
      ? `${t.title.year}–${t.title.endYear}`
      : String(t.title.year)
    : ''

  return (
    <div className="flex items-center gap-3 py-2 px-1.5 border-b border-dotted border-cream-border dark:border-warm-700">
      {/* Tiny poster */}
      <Link
        href={`/titles/${t.titleId}`}
        className="block w-9 shrink-0 hover:opacity-90 transition-opacity"
      >
        {t.title.imageUrl ? (
          <LightboxImage
            src={t.title.imageUrl}
            alt={t.title.name}
            sizes="36px"
            containerClassName="aspect-[2/3] rounded-sm overflow-hidden relative bg-warm-100 dark:bg-warm-700"
          />
        ) : (
          <Placeholder name={t.title.name} variant="poster" className="rounded-sm" />
        )}
      </Link>

      {/* Title → year → type bubble, stacked */}
      <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
        <Link
          href={`/titles/${t.titleId}`}
          className="max-w-full truncate font-serif font-bold text-[14px] sm:text-[15px] text-warm-900 dark:text-warm-200 hover:text-steve transition-colors"
        >
          {t.title.name}
        </Link>
        {yearText && (
          <span className="font-serif font-bold italic text-[12px] text-warm-600 dark:text-warm-500 tabular-nums">
            {yearText}
          </span>
        )}
        <TitleBadge type={t.title.titleType} />
      </div>

      {/* Episode count (TV) on the right */}
      {t.episodeCount > 0 && (
        <span className="shrink-0 text-[11px] text-warm-600 dark:text-warm-500 tabular-nums whitespace-nowrap">
          {t.episodeCount} ep{t.episodeCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}
