'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

function useCountUp(target: number, duration: number, enabled: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let startTime: number | null = null
    let frame: number

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) {
        frame = requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, enabled])

  return count
}

function StatItem({
  label,
  value,
  href,
  animate,
  delay = 0,
}: {
  label: string
  value: number
  href: string
  animate: boolean
  delay?: number
}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setActive(true), delay)
    return () => clearTimeout(t)
  }, [animate, delay])

  const count = useCountUp(value, 1000, active)

  return (
    <Link href={href} className="group">
      <div className="font-display text-3xl text-steve leading-none group-hover:text-steve-hover transition-colors tabular-nums">
        {count.toLocaleString()}
      </div>
      <div className="text-xs text-warm-600 dark:text-warm-500 tracking-widest uppercase mt-1">{label}</div>
    </Link>
  )
}

export function StatsSection({
  people,
  characters,
  titles,
  castings,
}: {
  people: number
  characters: number
  titles: number
  castings: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimate(true) },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref}>
      <div className="flex gap-6 mt-6 flex-wrap">
        <StatItem label="People"     value={people}     href="/people"     animate={animate} delay={0} />
        <StatItem label="Characters" value={characters} href="/characters" animate={animate} delay={100} />
        <StatItem label="Titles"     value={titles}     href="/titles"     animate={animate} delay={200} />
      </div>
      <p className="text-sm text-warm-600 dark:text-warm-500 mt-4 leading-relaxed">
        That's a lot of Steves!
      </p>
      <p className="text-sm text-warm-600 dark:text-warm-500 mt-4 leading-relaxed">
        {' '}
        <span className="font-display text-3xl text-steve">{castings.toLocaleString()}</span>
        {' '}documented appearances and counting.
      </p>
    </div>
  )
}
