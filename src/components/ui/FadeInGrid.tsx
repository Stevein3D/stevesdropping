'use client'

import { useEffect, useRef } from 'react'

interface FadeInGridProps {
  children: React.ReactNode
  className?: string
}

const INITIAL_DELAY = 100 // ms pause before first tile animates
const ROW_DELAY = 50      // additional delay per row
const COL_DELAY = 45      // left-to-right stagger within a row

export function FadeInGrid({ children, className }: FadeInGridProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tiles = Array.from(el.children) as HTMLElement[]

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return

        // Group tiles by row — round `top` to nearest 8px to absorb sub-pixel gaps
        const rowMap = new Map<number, { tile: HTMLElement; left: number }[]>()
        visible.forEach((entry) => {
          const rowKey = Math.round(entry.boundingClientRect.top / 8) * 8
          if (!rowMap.has(rowKey)) rowMap.set(rowKey, [])
          rowMap.get(rowKey)!.push({
            tile: entry.target as HTMLElement,
            left: entry.boundingClientRect.left,
          })
        })

        // Sort rows top → bottom; within each row sort left → right
        const rows = Array.from(rowMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([, items]) =>
            items.sort((a, b) => a.left - b.left).map((item) => item.tile),
          )

        rows.forEach((rowTiles, rowIndex) => {
          rowTiles.forEach((tile, colIndex) => {
            const delay = INITIAL_DELAY + rowIndex * ROW_DELAY + colIndex * COL_DELAY
            tile.style.transition = `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`
            tile.style.opacity = '1'
            tile.style.transform = 'translateY(0)'
            observer.unobserve(tile)
          })
        })
      },
      { threshold: 0.05 },
    )

    tiles.forEach((tile) => observer.observe(tile))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} data-fade-grid>
      {children}
    </div>
  )
}
