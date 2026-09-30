'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Placeholder } from '@/components/ui/Placeholder'

export type TitleCastTileData = {
  personHref: string
  characterHref: string
  personName: string
  characterName: string
  personImageUrl: string | null
  characterImageUrl: string | null
  years: string | null
  appearanceCount: number
}

// Title-page cast tile. Unlike CastTile (one link for the whole tile), each part
// links on its own: banner → character, name → person. When the character has
// an image it fills the tile with the actor as a round corner inset; tapping
// the inset swaps the two (no hover, so it works on touch), and the main image
// links to whoever it currently shows. No character image → actor photo only.
export function TitleCastTile({ tile }: { tile: TitleCastTileData }) {
  const [swapped, setSwapped] = useState(false)

  const character = { href: tile.characterHref, src: tile.characterImageUrl, name: tile.characterName }
  const actor = { href: tile.personHref, src: tile.personImageUrl, name: tile.personName }
  const hasInset = !!tile.characterImageUrl
  const main = hasInset && !swapped ? character : actor
  const inset = swapped ? character : actor

  return (
    <div className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-md p-2.5 flex flex-col gap-2 hover:border-steve dark:hover:border-warm-200 transition">
      <Link
        href={tile.characterHref}
        className="block bg-steve text-cream rounded-sm py-1.5 px-2 text-center text-[10px] font-semibold uppercase truncate hover:brightness-110 transition"
        style={{ letterSpacing: '0.08em' }}
      >
        {tile.characterName}
      </Link>
      <div className="relative aspect-[3/4]">
        <Link href={main.href} className="absolute inset-0 rounded-sm overflow-hidden">
          <Portrait key={main.name} src={main.src} alt={main.name} name={main.name} />
        </Link>
        {hasInset && (
          <button
            type="button"
            onClick={() => setSwapped(v => !v)}
            aria-pressed={swapped}
            aria-label={swapped ? `Show ${tile.characterName} (character)` : `Show ${tile.personName} (actor)`}
            className="absolute z-10 -bottom-2 -right-2 h-11 w-11 rounded-full overflow-hidden ring-[3px] ring-cream-card dark:ring-warm-800 shadow-md hover:ring-steve focus-visible:ring-steve transition"
          >
            <Portrait key={inset.name} src={inset.src} alt="" name={inset.name} />
          </button>
        )}
      </div>
      {/* Extra top padding so the overhanging inset clears the name; applied to
          every tile so names line up across the row. */}
      <Link
        href={tile.personHref}
        className="font-serif font-bold text-[14px] text-center text-warm-900 dark:text-warm-200 leading-tight hover:text-steve dark:hover:text-steve transition-colors pt-1.5"
      >
        {tile.personName}
      </Link>
      {tile.years && (
        <div className="text-[11px] text-steve font-medium text-center tabular-nums">{tile.years}</div>
      )}
      <div
        className="mt-auto border-t border-dotted border-cream-border dark:border-warm-700 pt-1.5 text-center text-[9px] uppercase text-warm-600 dark:text-warm-500 tabular-nums"
        style={{ letterSpacing: '0.1em' }}
      >
        {tile.appearanceCount} appearance{tile.appearanceCount === 1 ? '' : 's'}
      </div>
    </div>
  )
}

function Portrait({ src, alt, name }: { src: string | null; alt: string; name: string }) {
  return src ? (
    <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 640px) 45vw, 150px" />
  ) : (
    <Placeholder name={name} variant="portrait" className="rounded-sm h-full" />
  )
}
