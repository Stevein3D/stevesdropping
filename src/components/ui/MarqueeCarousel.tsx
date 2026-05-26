'use client'
import Link from 'next/link'
import { useState } from 'react'

type CarouselItem = {
  id: number
  name: string
  imageUrl: string
  href: string
  imageVersion?: number
}

type Kind = 'person' | 'character' | 'title'

// Target scroll speed in px/s — all rows use this
const PX_PER_SEC = 30

type RowProps = {
  items: CarouselItem[]
  direction: 'left' | 'right'
  itemWidth: string   // tailwind w-* class
  itemHeight: string  // tailwind h-* class
  itemWidthPx: number // actual pixel width for speed calculation
  ikWidth: number     // imagekit pixel width
  kind: Kind
  onHover: (entry: { name: string; kind: Kind } | null) => void
}

function MarqueeRow({ items, direction, itemWidth, itemHeight, itemWidthPx, ikWidth, kind, onHover }: RowProps) {
  const GAP_PX = 8
  const duration = (items.length * (itemWidthPx + GAP_PX)) / PX_PER_SEC
  // Triple so the -33.333% translation always covers a full set
  const MIN_COPIES = Math.ceil(12 / items.length)
  const copies = Math.max(3, MIN_COPIES)
  const repeated = Array.from({ length: copies }, () => items).flat()

  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'} hover:[animation-play-state:paused]`}
        style={{ display: 'flex', gap: '8px', width: 'max-content', animationDuration: `${duration}s` }}
      >
        {repeated.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            tabIndex={-1}
            onMouseEnter={() => onHover({ name: item.name, kind })}
            className={`${itemWidth} ${itemHeight} flex-shrink-0 rounded overflow-hidden bg-warm-100 dark:bg-warm-700 block transition-transform duration-200 hover:scale-[1.03]`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${item.imageUrl.split('?')[0]}?tr=w-${ikWidth},q-80${item.imageVersion ? `&ik-t=${item.imageVersion}` : ''}`}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}

const KIND_LABEL: Record<Kind, string> = {
  person: 'Person',
  character: 'Character',
  title: 'Title',
}

type Props = {
  people:     CarouselItem[]
  characters: CarouselItem[]
  titles:     CarouselItem[]
}

export function MarqueeCarousel({ people, characters, titles }: Props) {
  const [hovered, setHovered] = useState<{ name: string; kind: Kind } | null>(null)

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* Hover readout — shows whichever image the cursor is over */}
      <div className="h-7 px-1 flex items-baseline gap-2 overflow-hidden" aria-live="polite">
        <span
          className={`text-[9px] uppercase font-semibold text-warm-500 dark:text-warm-500 transition-opacity duration-150 shrink-0 ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ letterSpacing: '0.18em' }}
        >
          {hovered ? KIND_LABEL[hovered.kind] : ' '}
        </span>
        <span
          className={`font-serif font-bold text-[18px] text-steve truncate transition-all duration-200 ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          {hovered?.name ?? ' '}
        </span>
      </div>

      {/* Row 1 — People, scroll left */}
      {people.length > 0 && (
        <MarqueeRow
          items={people}
          direction="left"
          itemWidth="w-24"
          itemHeight="h-32"
          itemWidthPx={96}
          ikWidth={192}
          kind="person"
          onHover={setHovered}
        />
      )}

      {/* Row 2 — Characters, scroll right */}
      {characters.length > 0 && (
        <MarqueeRow
          items={characters}
          direction="right"
          itemWidth="w-36"
          itemHeight="h-48"
          itemWidthPx={144}
          ikWidth={288}
          kind="character"
          onHover={setHovered}
        />
      )}

      {/* Row 3 — Titles, scroll left */}
      {titles.length > 0 && (
        <MarqueeRow
          items={titles}
          direction="left"
          itemWidth="w-24"
          itemHeight="h-32"
          itemWidthPx={96}
          ikWidth={192}
          kind="title"
          onHover={setHovered}
        />
      )}
    </div>
  )
}
