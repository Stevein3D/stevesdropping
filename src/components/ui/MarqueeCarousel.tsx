'use client'
import Link from 'next/link'

type CarouselItem = {
  id: number
  name: string
  imageUrl: string
  href: string
  imageVersion?: number
}

// Target scroll speed in px/s — all rows use this
const PX_PER_SEC = 30

type RowProps = {
  items: CarouselItem[]
  direction: 'left' | 'right'
  itemWidth: string   // tailwind w-* class
  itemHeight: string  // tailwind h-* class
  itemWidthPx: number // actual pixel width for speed calculation
  ikWidth: number     // imagekit pixel width
}

function MarqueeRow({ items, direction, itemWidth, itemHeight, itemWidthPx, ikWidth }: RowProps) {
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
    >
      <div
        className={direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}
        style={{ display: 'flex', gap: '8px', width: 'max-content', animationDuration: `${duration}s` }}
      >
        {repeated.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            tabIndex={-1}
            className={`${itemWidth} ${itemHeight} flex-shrink-0 rounded overflow-hidden bg-warm-100 dark:bg-warm-700 block`}
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

type Props = {
  people:     CarouselItem[]
  characters: CarouselItem[]
  titles:     CarouselItem[]
}

export function MarqueeCarousel({ people, characters, titles }: Props) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* Row 1 — People, scroll left */}
      {people.length > 0 && (
        <MarqueeRow
          items={people}
          direction="left"
          itemWidth="w-24"
          itemHeight="h-32"
          itemWidthPx={96}
          ikWidth={192}
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
        />
      )}
    </div>
  )
}
