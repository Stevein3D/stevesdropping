import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ImageUploadButton } from '@/components/admin/ImageUploadButton'
import { BatchUploadSection } from '@/components/admin/BatchUploadSection'

export const dynamic = 'force-dynamic'

type Tab = 'people' | 'characters' | 'titles' | 'castings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'people',     label: 'People' },
  { key: 'characters', label: 'Characters' },
  { key: 'titles',     label: 'Titles' },
  { key: 'castings',   label: 'Castings' },
]

export default async function AdminImagesPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const tab = (searchParams.tab ?? 'people') as Tab

  const [people, characters, titles, castings] = await Promise.all([
    prisma.person.findMany({ orderBy: [{ imageUrl: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }] }),
    prisma.character.findMany({ orderBy: [{ imageUrl: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }] }),
    prisma.title.findMany({ orderBy: [{ imageUrl: { sort: 'asc', nulls: 'first' } }, { year: 'desc' }] }),
    prisma.casting.findMany({
      include: { person: true, character: true, title: true },
      orderBy: [{ imageUrl: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
    }),
  ])

  const counts = {
    people:     people.filter((r) => !r.imageUrl).length,
    characters: characters.filter((r) => !r.imageUrl).length,
    titles:     titles.filter((r) => !r.imageUrl).length,
    castings:   castings.filter((r) => !r.imageUrl).length,
  }

  const castingRecords = castings.map((c) => ({
    id:       c.id,
    name:     `${c.person.name} as ${c.character.name}`,
    imageUrl: c.imageUrl,
  }))

  const titleRecords = titles.map((t) => ({
    id:       t.id,
    name:     `${t.name}${t.year ? ` (${t.year})` : ''}`,
    imageUrl: t.imageUrl,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-cream-border dark:border-warm-700 pt-2 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-900 dark:text-warm-200">Images</h1>
        <span className="text-xs text-warm-500">
          {Object.values(counts).reduce((a, b) => a + b, 0)} missing
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-cream-border dark:border-warm-700">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/images?tab=${key}`}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-steve text-steve font-medium'
                : 'border-transparent text-warm-600 dark:text-warm-500 hover:text-steve'
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className="ml-1.5 text-[10px] bg-warm-100 dark:bg-warm-700 text-warm-500 px-1.5 py-0.5 rounded-full">
                {counts[key]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* People */}
      {tab === 'people' && (
        <>
          <BatchUploadSection
            records={people}
            entity="person"
            folder="/stevesdropping/people"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {people.map((person) => (
              <ImageUploadButton
                key={person.id}
                entity="person"
                id={person.id}
                folder="/stevesdropping/people"
                fileName={`${person.id}.jpg`}
                currentUrl={person.imageUrl}
                label={person.name}
              />
            ))}
          </div>
        </>
      )}

      {/* Characters */}
      {tab === 'characters' && (
        <>
          <BatchUploadSection
            records={characters}
            entity="character"
            folder="/stevesdropping/characters"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {characters.map((character) => (
              <ImageUploadButton
                key={character.id}
                entity="character"
                id={character.id}
                folder="/stevesdropping/characters"
                fileName={`${character.id}.jpg`}
                currentUrl={character.imageUrl}
                label={character.name}
              />
            ))}
          </div>
        </>
      )}

      {/* Titles */}
      {tab === 'titles' && (
        <>
          <BatchUploadSection
            records={titleRecords}
            entity="title"
            folder="/stevesdropping/titles"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {titles.map((title) => (
              <ImageUploadButton
                key={title.id}
                entity="title"
                id={title.id}
                folder="/stevesdropping/titles"
                fileName={`${title.id}.jpg`}
                currentUrl={title.imageUrl}
                label={`${title.name}${title.year ? ` (${title.year})` : ''}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Castings */}
      {tab === 'castings' && (
        <>
          <BatchUploadSection
            records={castingRecords}
            entity="casting"
            folder="/stevesdropping/casting"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {castings.map((casting) => (
              <ImageUploadButton
                key={casting.id}
                entity="casting"
                id={casting.id}
                folder="/stevesdropping/casting"
                fileName={`${casting.id}.jpg`}
                currentUrl={casting.imageUrl}
                label={`${casting.person.name} as ${casting.character.name}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
