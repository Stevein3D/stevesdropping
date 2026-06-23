'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CastingRow, type CastingRowData } from './CastingRow'
import { Placeholder } from './Placeholder'

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
}: {
  characters: FilmographyCharacter[]
  stats: FilmographyStats
  defaultCompact: boolean
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2 flex-wrap gap-2">
        <h2 className="font-serif text-[22px] font-black text-warm-900 dark:text-warm-200">
          Filmography
        </h2>
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
          <div>
            {cg.titles.map((t) => (
              <CastingRow key={t.titleId} data={t} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
