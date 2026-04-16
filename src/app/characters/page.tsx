import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Characters — Stevesdropping' }

const PAGE_SIZE = 48

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string }
}) {
  const { search = '' } = searchParams
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {}

  const [total, characters] = await Promise.all([
    prisma.character.count({ where }),
    prisma.character.findMany({
      where,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        updatedAt: true,
        castings: {
          select: { personId: true, person: { select: { id: true, name: true } } },
          distinct: ['personId'],
        },
        _count: { select: { castings: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pb-2">
        <h1 className="font-serif text-3xl font-bold text-warm-900 dark:text-warm-200">Characters</h1>
        <span className="text-xs text-warm-500">{total} results</span>
      </div>
      <SearchInput placeholder="Search characters…" paramName="search" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {characters.map((character) => (
          <Link
            key={character.id}
            href={`/characters/${character.id}`}
            className="bg-cream-card dark:bg-warm-50/5 border border-cream-subtle dark:border-warm-700 rounded-lg overflow-hidden hover:border-steve dark:hover:border-warm-200 transition-colors"
          >
            {/* Image */}
            <div className="aspect-[3/4] relative bg-warm-100 dark:bg-warm-700">
              {character.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${character.imageUrl.split('?')[0]}?tr=w-640,q-80&ik-t=${Math.floor(character.updatedAt.getTime() / 1000)}`}
                  alt={character.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-end p-2">
                  <span className="text-[10px] text-warm-400">No image</span>
                </div>
              )}
            </div>
            {/* Text */}
            <div className="p-3">
              <h2 className="font-serif font-bold text-warm-900 dark:text-warm-200 leading-tight mb-1">
                {character.name}
              </h2>
              <p className="text-xs text-steve mb-2">
                {character._count.castings} appearance{character._count.castings !== 1 ? 's' : ''}
              </p>
              {character.castings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {character.castings.map((c) => (
                    <span
                      key={c.person.id}
                      className="text-xs bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-500 px-2 py-0.5 rounded"
                    >
                      {c.person.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/characters" />
    </div>
  )
}
