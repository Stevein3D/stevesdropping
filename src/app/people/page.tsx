import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { PersonWithCastings } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'People — Stevesdropping' }

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string }
}) {
  const { search = '', type } = searchParams

  const people = await prisma.person.findMany({
    where: {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(type && { personType: type as any }),
    },
    include: {
      castings: {
        include: { character: true, title: true, episode: true },
      },
    },
    orderBy: { name: 'asc' },
  }) as PersonWithCastings[]

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">People</h1>
        <span className="text-xs text-warm-500">{people.length} results</span>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name…"
          className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 placeholder-warm-500 focus:outline-none focus:border-steve w-64"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="bg-cream-card dark:bg-warm-50/5 border border-cream-border dark:border-warm-700 rounded-lg px-4 py-2 text-sm text-warm-900 dark:text-warm-200 focus:outline-none focus:border-steve"
        >
          <option value="">All types</option>
          <option value="actor">Actor</option>
          <option value="celebrity">Celebrity</option>
          <option value="musician">Musician</option>
          <option value="athlete">Athlete</option>
          <option value="other">Other</option>
        </select>
        <button
          type="submit"
          className="bg-steve hover:bg-steve-hover text-cream text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Filter
        </button>
        {(search || type) && (
          <Link
            href="/people"
            className="text-sm text-warm-600 dark:text-warm-500 hover:text-steve px-4 py-2 rounded-lg border border-cream-border dark:border-warm-700 hover:border-steve transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg p-4 hover:border-steve transition-colors"
          >
            {person.birthYear && (
              <p className="text-xs text-warm-500 tracking-wide mb-1">
                b. {person.birthYear}
                {person.deathYear ? ` — d. ${person.deathYear}` : ''}
                {person.nationality ? ` · ${person.nationality}` : ''}
              </p>
            )}
            <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight mb-1">
              {person.name}
            </h2>
            {person.castings.length > 0 && (
              <p className="text-xs text-steve mb-2">
                {person.castings.length} casting{person.castings.length !== 1 ? 's' : ''}
              </p>
            )}
            <span className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded capitalize">
              {person.personType}
            </span>
          </Link>
        ))}
      </div>

      {people.length === 0 && (
        <p className="text-warm-500 text-center py-20">No people found matching your search.</p>
      )}
    </div>
  )
}
