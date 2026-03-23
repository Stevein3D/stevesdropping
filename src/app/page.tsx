import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function HomePage() {
  const [peopleCount, characterCount, titleCount, castingCount] = await Promise.all([
    prisma.person.count(),
    prisma.character.count(),
    prisma.title.count(),
    prisma.casting.count(),
  ])

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 pt-8">
        <h1 className="text-5xl font-bold tracking-tight">
          All Steves. <span className="text-sky-400">All the Time.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          A database cataloging every Steve and Steven across film, television, and beyond —
          real people and the characters they play.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'People', value: peopleCount, href: '/people' },
          { label: 'Characters', value: characterCount, href: '/characters' },
          { label: 'Titles', value: titleCount, href: '/titles' },
          { label: 'Castings', value: castingCount, href: '/people' },
        ].map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center hover:border-sky-500 transition-colors group"
          >
            <div className="text-3xl font-bold text-sky-400 group-hover:text-sky-300">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </Link>
        ))}
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href="/people" className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-sky-500 transition-colors">
          <h2 className="font-semibold text-lg mb-1">Browse People</h2>
          <p className="text-gray-500 text-sm">Actors and notable figures named Steve or Steven</p>
        </Link>
        <Link href="/characters" className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-sky-500 transition-colors">
          <h2 className="font-semibold text-lg mb-1">Browse Characters</h2>
          <p className="text-gray-500 text-sm">Fictional characters with the Steve name</p>
        </Link>
        <Link href="/titles" className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-sky-500 transition-colors">
          <h2 className="font-semibold text-lg mb-1">Browse Titles</h2>
          <p className="text-gray-500 text-sm">Films, TV shows, and more featuring Steves</p>
        </Link>
      </section>
    </div>
  )
}
