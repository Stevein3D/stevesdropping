import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { PersonWithCastings } from '@/types'

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">People</h1>
        <span className="text-sm text-gray-500">{people.length} results</span>
      </div>

      {/* Filters */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name…"
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 w-64"
        />
        <select
          name="type"
          defaultValue={type ?? ''}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
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
          className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Filter
        </button>
        {(search || type) && (
          <Link
            href="/people"
            className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
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
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-sky-500 transition-colors group space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-white group-hover:text-sky-400 transition-colors leading-tight">
                {person.name}
              </h2>
              <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5 shrink-0 capitalize">
                {person.personType}
              </span>
            </div>

            {person.birthYear && (
              <p className="text-xs text-gray-500">
                b. {person.birthYear}
                {person.deathYear ? ` — d. ${person.deathYear}` : ''}
                {person.nationality ? ` · ${person.nationality}` : ''}
              </p>
            )}

            {person.bio && (
              <p className="text-sm text-gray-400 line-clamp-2">{person.bio}</p>
            )}

            {person.castings.length > 0 && (
              <p className="text-xs text-sky-500">
                {person.castings.length} casting{person.castings.length !== 1 ? 's' : ''}
                {' · '}
                {[...new Set(person.castings.map((c) => c.character.name))].join(', ')}
              </p>
            )}
          </Link>
        ))}
      </div>

      {people.length === 0 && (
        <p className="text-gray-500 text-center py-20">No people found matching your search.</p>
      )}
    </div>
  )
}
