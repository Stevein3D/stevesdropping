'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type ImageItem = {
  id: number
  name: string
  imageUrl: string
  imageVersion: number
}

type Props = {
  href: string
  heading: string
  body: string
  images: ImageItem[]
  index?: number
}

export function BrowseTile({ href, heading, body, images, index = 0 }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    // Stagger each tile's cycle by ~1/3 of the interval so they don't swap together
    const INTERVAL = 5500
    const initialDelay = (index % 3) * Math.floor(INTERVAL / 3)
    let timer: ReturnType<typeof setInterval>
    const delay = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % images.length)
      timer = setInterval(() => {
        setActiveIndex((i) => (i + 1) % images.length)
      }, INTERVAL)
    }, initialDelay)
    return () => {
      clearTimeout(delay)
      clearInterval(timer)
    }
  }, [images.length, index])

  return (
    <Link
      href={href}
      className="relative flex overflow-hidden rounded-lg border border-cream-subtle dark:border-warm-700 hover:border-steve dark:hover:border-warm-200 transition-colors bg-cream-card dark:bg-warm-50/5 min-h-[140px]"
    >
      {/* Text — left portion, sits above the image via z-10 */}
      <div className="w-[60%] shrink-0 p-6 relative z-10">
        <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 mb-1">
          {heading}
        </h2>
        <p className="text-sm text-warm-600 dark:text-warm-500">{body}</p>
      </div>

      {/* Image panel — absolutely positioned so portrait images fill tile height */}
      {images.length > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 w-[110px]"
          style={{
            // Fade the entire left side of the image; the ~90deg angle gives a
            // slight rightward slant so the dividing line isn't perfectly vertical
            maskImage:
              'linear-gradient(85deg, transparent 0%, rgba(0,0,0,0) 15%, black 30%)',
            WebkitMaskImage:
              'linear-gradient(85deg, transparent 0%, rgba(0,0,0,0) 15%, black 30%)',
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              role="img"
              aria-label={img.name}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
                i === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${img.imageUrl.split('?')[0]}?tr=w-320,q-80&ik-t=${img.imageVersion})`,
                backgroundSize: 'auto 110%',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ))}
        </div>
      )}
    </Link>
  )
}
