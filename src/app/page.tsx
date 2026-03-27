import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [peopleCount, characterCount, titleCount, castingCount] = await Promise.all([
    prisma.person.count(),
    prisma.character.count(),
    prisma.title.count(),
    prisma.casting.count(),
  ])

  const stats = [
    { label: 'People', value: peopleCount, href: '/people' },
    { label: 'Characters', value: characterCount, href: '/characters' },
    { label: 'Titles', value: titleCount, href: '/titles' },
    { label: 'Castings', value: castingCount, href: '/people' },
  ]

  return (
    <div>
      <section className="py-8 border-b border-cream-border dark:border-warm-700 mb-8">
        <p className="text-xs text-steve tracking-widest uppercase mb-2">The Steve Database</p>
        <h1 className="font-serif text-5xl font-black leading-tight tracking-tight text-warm-900 dark:text-warm-200">
          All Steves,<br />
          <em className="text-steve">all the time.</em>
        </h1>
        <p className="text-sm text-warm-600 dark:text-warm-500 mt-3 max-w-md leading-relaxed">
          A catalog of every Steve across film, television, and beyond —
          real people and the characters they play.
        </p>
        <div className="flex gap-8 mt-6">
          {stats.map(({ label, value, href }) => (
            <Link key={label} href={href} className="group">
              <div className="font-serif text-3xl font-bold text-steve leading-none group-hover:text-steve-hover transition-colors">{value}</div>
              <div className="text-xs text-warm-500 tracking-widest uppercase mt-1">{label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          { href: '/people',     heading: 'Browse People',     body: 'Actors and notable figures named Steve or Steven' },
          { href: '/characters', heading: 'Browse Characters', body: 'Fictional characters with the Steve name' },
          { href: '/titles',     heading: 'Browse Titles',     body: 'Films, TV shows, and more featuring Steves' },
        ].map(({ href, heading, body }) => (
          <Link
            key={href}
            href={href}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-6 hover:border-steve transition-colors"
          >
            <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 mb-1">{heading}</h2>
            <p className="text-sm text-warm-600 dark:text-warm-500">{body}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
