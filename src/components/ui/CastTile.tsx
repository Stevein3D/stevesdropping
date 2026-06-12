import Link from 'next/link'
import Image from 'next/image'
import { Placeholder } from '@/components/ui/Placeholder'

export type CastTileData = {
  href: string
  banner: string
  imageUrl: string | null
  imageAlt: string
  name: string
  years: string | null
  appearanceCount: number
}

// Cast/role tile shared by the title, person, and character detail pages:
// banner ribbon, portrait, name, year span (steve orange), appearance count.
export function CastTile({ tile }: { tile: CastTileData }) {
  return (
    <Link
      href={tile.href}
      className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-md p-2.5 flex flex-col gap-2 hover:border-steve dark:hover:border-warm-200 hover:-translate-y-0.5 transition"
    >
      <div
        className="bg-steve text-cream rounded-sm py-1 px-2 text-center text-[10px] font-semibold uppercase truncate"
        style={{ letterSpacing: '0.08em' }}
      >
        {tile.banner}
      </div>
      {tile.imageUrl ? (
        <div className="aspect-[3/4] rounded-sm overflow-hidden relative">
          <Image
            src={tile.imageUrl}
            alt={tile.imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 45vw, 150px"
          />
        </div>
      ) : (
        <Placeholder name={tile.name} variant="portrait" className="rounded-sm" />
      )}
      <div className="font-serif font-bold text-[14px] text-center text-warm-900 dark:text-warm-200 leading-tight">
        {tile.name}
      </div>
      {tile.years && (
        <div className="text-[11px] text-steve font-medium text-center tabular-nums">
          {tile.years}
        </div>
      )}
      <div
        className="mt-auto border-t border-dotted border-cream-border dark:border-warm-700 pt-1.5 text-center text-[9px] uppercase text-warm-600 dark:text-warm-500 tabular-nums"
        style={{ letterSpacing: '0.1em' }}
      >
        {tile.appearanceCount} appearance{tile.appearanceCount === 1 ? '' : 's'}
      </div>
    </Link>
  )
}

// Collapses a list of years into "1994" or "1994–2003"; null when no years known.
export function yearSpan(years: (number | null | undefined)[]): string | null {
  const ys = years.filter((y): y is number => y != null)
  if (ys.length === 0) return null
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  return min === max ? String(min) : `${min}–${max}`
}
