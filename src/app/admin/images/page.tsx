import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BatchUploadSection } from '@/components/admin/BatchUploadSection'
import { AdminImageSearch } from '@/components/admin/AdminImageSearch'
import { PurgeCacheButton } from '@/components/admin/PurgeCacheButton'

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

  function sortRecords<T extends { imageUrl: string | null; name: string }>(arr: T[]): T[] {
    return [...arr].sort((a, b) => {
      const aMissing = !a.imageUrl ? 0 : 1
      const bMissing = !b.imageUrl ? 0 : 1
      if (aMissing !== bMissing) return aMissing - bMissing
      return a.name.localeCompare(b.name)
    })
  }

  const [people, characters, titles, castings] = await Promise.all([
    prisma.person.findMany({ orderBy: { name: 'asc' } }),
    prisma.character.findMany({ orderBy: { name: 'asc' } }),
    prisma.title.findMany({ select: { id: true, name: true, titleSort: true, year: true, imageUrl: true, featured: true, updatedAt: true }, orderBy: { name: 'asc' } }),
    prisma.casting.findMany({
      include: { person: true, character: true, title: true },
      orderBy: { id: 'asc' },
    }),
  ])

  const counts = {
    people:     people.filter((r) => !r.imageUrl).length,
    characters: characters.filter((r) => !r.imageUrl).length,
    titles:     titles.filter((r) => !r.imageUrl).length,
    castings:   castings.filter((r) => !r.imageUrl).length,
  }

  const castingRecords = sortRecords(castings.map((c) => ({
    id:           c.id,
    name:         `${c.person.name} as ${c.character.name}`,
    imageUrl:     c.imageUrl,
    cacheVersion: c.updatedAt.getTime(),
  })))

  const titleRecords = [...titles]
    .sort((a, b) => {
      const aMissing = !a.imageUrl ? 0 : 1
      const bMissing = !b.imageUrl ? 0 : 1
      if (aMissing !== bMissing) return aMissing - bMissing
      return (a.titleSort ?? a.name).localeCompare(b.titleSort ?? b.name)
    })
    .map((t) => ({
      id:           t.id,
      name:         `${t.name}${t.year ? ` (${t.year})` : ''}`,
      imageUrl:     t.imageUrl,
      featured:     t.featured,
      cacheVersion: t.updatedAt.getTime(),
    }))

  const peopleRecords    = sortRecords(people.map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, featured: p.featured, cacheVersion: p.updatedAt.getTime() })))
  const characterRecords = sortRecords(characters.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl, featured: c.featured, cacheVersion: c.updatedAt.getTime() })))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-cream-border dark:border-warm-700 pt-2 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-900 dark:text-warm-200">Images</h1>
        <div className="flex items-center gap-4">
          <PurgeCacheButton entity={tab === 'people' ? 'person' : tab === 'characters' ? 'character' : tab === 'titles' ? 'title' : 'casting'} />
          <span className="text-xs text-warm-500">
            {Object.values(counts).reduce((a, b) => a + b, 0)} missing
          </span>
        </div>
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
          <BatchUploadSection records={peopleRecords} entity="person" folder="/stevesdropping/people" />
          <AdminImageSearch records={peopleRecords} entity="person" folder="/stevesdropping/people" />
        </>
      )}

      {/* Characters */}
      {tab === 'characters' && (
        <>
          <BatchUploadSection records={characterRecords} entity="character" folder="/stevesdropping/characters" />
          <AdminImageSearch records={characterRecords} entity="character" folder="/stevesdropping/characters" />
        </>
      )}

      {/* Titles */}
      {tab === 'titles' && (
        <>
          <BatchUploadSection records={titleRecords} entity="title" folder="/stevesdropping/titles" />
          <AdminImageSearch
            records={titleRecords}
            entity="title"
            folder="/stevesdropping/titles"
          />
        </>
      )}

      {/* Castings */}
      {tab === 'castings' && (
        <>
          <BatchUploadSection records={castingRecords} entity="casting" folder="/stevesdropping/casting" />
          <AdminImageSearch
            records={castingRecords}
            entity="casting"
            folder="/stevesdropping/casting"
          />
        </>
      )}
    </div>
  )
}
